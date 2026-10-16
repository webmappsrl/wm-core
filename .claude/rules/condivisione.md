---
paths:
  - "projects/wm-core/src/services/share-image.service*.ts"
  - "projects/wm-core/src/passport/passport-share-preview/**"
---

# Trappole: condivisione di un'immagine

Contesto: [docs/knowledge/condivisione-tappa-passaporto.md](../../docs/knowledge/condivisione-tappa-passaporto.md).

- **Nel browser non mettere `await` prima di `navigator.share()` o `window.open()` nel gestore del
  click**: il browser li accetta solo entro pochi secondi da un tocco, e dopo un'attesa (generazione
  dell'immagine, `fetch`) li rifiuta con `NotAllowedError` o li blocca come popup. Prepara il file
  prima, e condividi al tocco successivo (oc:8702).
- **Un retry automatico di `navigator.share()` non funziona**: senza un nuovo tocco viene rifiutato
  allo stesso modo (oc:8702).
- **Nel nativo, `Share.share` annullato dall'utente lancia un errore con «cancel» nel messaggio**:
  trattalo come silenzioso, non come fallimento (oc:8702).
