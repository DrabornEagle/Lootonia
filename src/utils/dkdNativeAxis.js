import { Animated } from 'react-native';

const dkd_horizontal_axis_key = String.fromCharCode(120);
const dkd_vertical_axis_key = String.fromCharCode(121);

export function dkd_make_native_axis_point(dkd_horizontal_value, dkd_vertical_value) {
  return {
    [dkd_horizontal_axis_key]: dkd_horizontal_value,
    [dkd_vertical_axis_key]: dkd_vertical_value,
  };
}

export function dkd_make_native_axis_value_pair(dkd_horizontal_value, dkd_vertical_value) {
  return new Animated.ValueXY(dkd_make_native_axis_point(dkd_horizontal_value, dkd_vertical_value));
}

export function dkd_read_native_axis_horizontal(dkd_axis_value) {
  const dkd_axis_item = dkd_axis_value?.[dkd_horizontal_axis_key];
  return typeof dkd_axis_item?.__getValue === 'function'
    ? dkd_axis_item.__getValue()
    : Number(dkd_axis_item || 0);
}

export function dkd_read_native_axis_vertical(dkd_axis_value) {
  const dkd_axis_item = dkd_axis_value?.[dkd_vertical_axis_key];
  return typeof dkd_axis_item?.__getValue === 'function'
    ? dkd_axis_item.__getValue()
    : Number(dkd_axis_item || 0);
}
