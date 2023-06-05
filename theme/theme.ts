import * as _color from 'color';
/**
 * Return a contrast color based on the color param
 *
 * @param color the color to get contrast
 * @param ratio the ratio of contrast. Higher value means higher contrast
 */
const defaults: ITHEME = {
  primary: '#3880ff',
  secondary: '#0cd1e8',
  tertiary: '#ff0000',
  select: 'rgba(226, 249, 0, 0.6)',
  success: '#10dc60',
  warning: '#ffce00',
  danger: '#f04141',
  dark: '#000000',
  medium: '#989aa2',
  light: '#ffffff',
  fontXxxlg: '28px',
  fontXxlg: '25px',
  fontXlg: '22px',
  fontLg: '20px',
  fontMd: '17px',
  fontSm: '14px',
  fontXsm: '12px',
  fontFamilyHeader: 'Roboto Slab',
  fontFamilyContent: 'Roboto',
  theme: 'webmapp',
};
export const Color = v => _color(v.trim().replace('\t', ''));
export const contrast = (color: any, ratio: number = 0.8): string => {
  if (color === '#000000') {
    return '#ffffff';
  }
  if (color === '#ffffff') {
    return '#000000';
  }

  color = Color(color);
  return color.isDark() ? color.lighten(ratio).hex() : color.darken(ratio).hex();
};

export const getCSSVariables = (colors: ITHEME): {[name: string]: any} => {
  colors = {...defaults, ...colors};

  const {
    primary,
    secondary,
    tertiary,
    success,
    warning,
    danger,
    dark,
    medium,
    light,
    fontXxxlg,
    fontXxlg,
    fontXlg,
    fontLg,
    fontMd,
    fontSm,
    fontXsm,
    fontFamilyHeader,
    fontFamilyContent,
    theme,
  } = colors;

  const shadeRatio: number = 0.1;
  const tintRatio: number = 0.1;

  return {
    '--wm-color-base': light,
    '--wm-color-contrast': dark,
    '--wm-background-color': light,
    '--wm-text-color': dark,
    '--wm-toolbar-background-color': contrast(light, 0.1),
    '--wm-toolbar-text-color': contrast(dark, 0.1),
    '--wm-item-background-color': contrast(light, 0.3),
    '--wm-item-text-color': contrast(dark, 0.3),
    '--wm-color-primary': primary,
    '--wm-color-primary-rgb': Color(primary).array().toString(),
    '--wm-color-primary-contrast': contrast(primary),
    '--wm-color-primary-contrast-rgb': Color(contrast(primary)).array().toString(),
    '--wm-color-primary-shade': Color(primary).darken(shadeRatio),
    '--wm-color-primary-tint': Color(primary).lighten(tintRatio),
    '--wm-color-secondary': secondary,
    '--wm-color-secondary-rgb': Color(secondary).array().toString(),
    '--wm-color-secondary-contrast': contrast(secondary),
    '--wm-color-secondary-contrast-rgb': Color(contrast(secondary)).array().toString(),
    '--wm-color-secondary-shade': Color(secondary).darken(shadeRatio),
    '--wm-color-secondary-tint': Color(secondary).lighten(tintRatio),
    '--wm-color-tertiary': tertiary,
    '--wm-color-tertiary-rgb': Color(tertiary).array().toString(),
    '--wm-color-tertiary-contrast': contrast(tertiary),
    '--wm-color-tertiary-contrast-rgb': Color(contrast(tertiary)).array().toString(),
    '--wm-color-tertiary-shade': Color(tertiary).darken(shadeRatio),
    '--wm-color-tertiary-tint': Color(tertiary).lighten(tintRatio),
    '--wm-color-success': success,
    '--wm-color-success-rgb': Color(success).array().toString(),
    '--wm-color-success-contrast': contrast(success),
    '--wm-color-success-contrast-rgb': Color(contrast(success)).array().toString(),
    '--wm-color-success-shade': Color(success).darken(shadeRatio),
    '--wm-color-success-tint': Color(success).lighten(tintRatio),
    '--wm-color-warning': warning,
    '--wm-color-warning-rgb': Color(warning).array().toString(),
    '--wm-color-warning-contrast': contrast(warning),
    '--wm-color-warning-contrast-rgb': Color(contrast(warning)).array().toString(),
    '--wm-color-warning-shade': Color(warning).darken(shadeRatio),
    '--wm-color-warning-tint': Color(warning).lighten(tintRatio),
    '--wm-color-danger': danger,
    '--wm-color-danger-rgb': Color(danger).array().toString(),
    '--wm-color-danger-contrast': contrast(danger),
    '--wm-color-danger-contrast-rgb': Color(contrast(danger)).array().toString(),
    '--wm-color-danger-shade': Color(danger).darken(shadeRatio),
    '--wm-color-danger-tint': Color(danger).lighten(tintRatio),
    '--wm-color-dark': dark,
    '--wm-color-dark-rgb': Color(dark).array().toString(),
    '--wm-color-dark-contrast': contrast(dark),
    '--wm-color-dark-contrast-rgb': Color(contrast(dark)).array().toString(),
    '--wm-color-dark-shade': Color(dark).darken(shadeRatio),
    '--wm-color-dark-tint': Color(dark).lighten(tintRatio),
    '--wm-color-medium': medium,
    '--wm-color-medium-rgb': Color(medium).array().toString(),
    '--wm-color-medium-contrast': contrast(medium),
    '--wm-color-medium-contrast-rgb': Color(contrast(medium)).array().toString(),
    '--wm-color-medium-shade': Color(medium).darken(shadeRatio),
    '--wm-color-medium-tint': Color(medium).lighten(tintRatio),
    '--wm-color-light': light,
    '--wm-color-light-rgb': Color(light).array().toString(),
    '--wm-color-light-contrast': contrast(light),
    '--wm-color-light-contrast-rgb': Color(contrast(light)).array().toString(),
    '--wm-color-light-shade': Color(light).darken(shadeRatio),
    '--wm-color-light-tint': Color(light).lighten(tintRatio),
    '--wm-font-xxx-lg': fontXxxlg,
    '--wm-font-xx-lg': fontXxlg,
    '--wm-font-x-lg': fontXlg,
    '--wm-font-lg': fontLg,
    '--wm-font-md': fontMd,
    '--wm-font-sm': fontSm,
    '--wm-font-xsm': fontXsm,
    '--wm-font-family-header': fontFamilyHeader,
    '--wm-font-family-content': fontFamilyContent,
  };
};
