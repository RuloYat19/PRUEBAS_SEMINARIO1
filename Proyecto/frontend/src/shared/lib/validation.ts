export type Errors<T> = Partial<Record<keyof T, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DPI = /^\d{13}$/

export function required(value: string, message = 'Este campo es obligatorio.') {
  return value.trim().length === 0 ? message : undefined
}

export function validateEmail(value: string) {
  if (required(value)) return 'Ingresa tu correo electrónico.'
  return EMAIL.test(value.trim()) ? undefined : 'Ese correo no parece válido.'
}

export function validateDpi(value: string) {
  if (required(value)) return 'Ingresa tu DPI.'
  return DPI.test(value.trim()) ? undefined : 'El DPI debe tener 13 dígitos, sin espacios ni guiones.'
}

const PASSWORD_COGNITO = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export function validatePassword(value: string) {
  if (!value) return 'Ingresa una contraseña.'
  return PASSWORD_COGNITO.test(value)
    ? undefined
    : 'Usa al menos 8 caracteres con mayúscula, minúscula, número y símbolo.'
}

export function validateMatch(value: string, expected: string) {
  if (!value) return 'Confirma tu contraseña.'
  return value === expected ? undefined : 'Las contraseñas no coinciden.'
}

export function hasErrors<T>(errors: Errors<T>) {
  return Object.values(errors).some(Boolean)
}
