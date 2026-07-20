/**
 * 多行文本字段；minRows 控制初始高度。
 */
"use client";

import type { FC } from "react";
import { TextField } from "@mui/material";
import { FormFieldShell } from "../../FormFieldShell";
import type { FormBoundFieldProps } from "../types/formBoundTypes";
import {
  readFormikFieldError,
  readFormikFieldString,
} from "../formBoundFieldProps";

type Props = FormBoundFieldProps<Record<string, unknown>> & {
  minRows?: number;
};

export const FormTextAreaField: FC<Props> = function (props) {
  const {
    name,
    label,
    formik,
    mode,
    required,
    disabled,
    placeholder,
    helperText,
    minRows = 3,
  } = props;

  const errorMsg = readFormikFieldError(formik, name);
  const watchText = readFormikFieldString(formik, name);

  return (
    <FormFieldShell
      label={label}
      mode={mode}
      required={required}
      error={errorMsg}
      helperText={helperText}
      watchText={watchText}
    >
      <TextField
        {...formik.getFieldProps(name)}
        value={watchText}
        id={`field-${name}`}
        size="small"
        fullWidth
        multiline
        minRows={minRows}
        placeholder={placeholder}
        disabled={disabled}
        error={Boolean(errorMsg)}
        inputProps={{ "aria-label": label }}
      />
    </FormFieldShell>
  );
};
