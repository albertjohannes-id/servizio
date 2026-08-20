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
  required?: boolean;
};

export function NumberField({
  label,
  value,
  onChangeDigits,
  lang,
  placeholder,
  grouped = true,
  required,
}: Props) {
  return (
    <TextField
      label={label}
      required={required}
      value={grouped ? formatIntInput(value, lang) : value}
      onChangeText={(text) => onChangeDigits(parseDigits(text))}
      keyboardType="numeric"
      placeholder={placeholder}
    />
  );
}
