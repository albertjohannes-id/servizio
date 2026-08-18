import React from 'react';
import { Lang } from '../i18n/strings';
import { formatIntInput, parseDigits } from '../domain/format';
import { TextField } from './TextField';

type Props = {
  label?: string;
  value: string;
  onChangeDigits: (digits: string) => void;
  lang: Lang;
  placeholder?: string;
  grouped?: boolean;
};

export function NumberField({
  label,
  value,
  onChangeDigits,
  lang,
  placeholder,
  grouped = true,
}: Props) {
  return (
    <TextField
      label={label}
      value={grouped ? formatIntInput(value, lang) : value}
      onChangeText={(text) => onChangeDigits(parseDigits(text))}
      keyboardType="numeric"
      placeholder={placeholder}
    />
  );
}
