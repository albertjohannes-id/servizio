import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { FieldLabel } from './FieldLabel';
import { colors } from '../theme';

type Props = TextInputProps & {
  label?: string;
  required?: boolean;
};

/** Bordered field with inset text so values never sit flush on the box. */
export function TextField({ label, required, style, multiline, ...rest }: Props) {
  return (
    <View>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <View style={[styles.box, multiline && styles.boxMulti]}>
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={colors.muted}
          style={[styles.input, multiline && styles.inputMulti, style]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    minHeight: 52,
    justifyContent: 'center',
  },
  boxMulti: { minHeight: 96, justifyContent: 'flex-start' },
  input: {
    fontSize: 17,
    color: colors.text,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 20,
    paddingRight: 16,
    margin: 0,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
});
