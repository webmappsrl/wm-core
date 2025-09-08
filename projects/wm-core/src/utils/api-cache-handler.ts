import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {synchronizedApi} from '@wm-core/utils/localForage';
import {distinctUntilChanged, shareReplay, take} from 'rxjs/operators';

export function handleApiCache<T>(
  http: HttpClient,
  url: string,
  updateData: (data: T) => void = (data: T) => {},
  headers: any = {},
): Observable<T> {
  return new Observable<T>(observer => {
    synchronizedApi.getItem(`${url}`).then((cachedData: string | null) => {
      let parsedData: T | null = null;
      const cachedLastModified = localStorage.getItem(`${url}-last-modified`);

      if (cachedData) {
        try {
          parsedData = JSON.parse(cachedData) as T;
          observer.next(parsedData);
        } catch (e) {
          console.warn('Error parsing cached data. Ignoring cache.', e);
        }
      }

      const requestHeaders = cachedLastModified
        ? {'If-Modified-Since': cachedLastModified, ...headers}
        : headers;

      http
        .get<T>(url, {
          observe: 'response',
          headers: requestHeaders,
        })
        .pipe(take(1))
        .subscribe(
          response => {
            const lastModified = response.headers.get('last-modified');

            if (response.status === 200) {
              const data = {...response.body};
              if (data) {
                updateData(data);
                synchronizedApi.setItem(`${url}`, JSON.stringify(data));
                if (lastModified) {
                  localStorage.setItem(`${url}-last-modified`, lastModified);
                }
                observer.next(data);
              }
            } else if (response.status === 304) {
              console.log('No changes detected, using cached data.');
            }
            observer.complete();
          },
          error => {
            if (!parsedData) {
              observer.error(error);
            } else {
              observer.complete();
            }
          },
        );
    });
  }).pipe(
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay(1),
  );
}
