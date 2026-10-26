import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { hasErrors, type Errors } from './validation'
import { messageFor } from '@/shared/api'

type Validator<T> = (values: T) => Errors<T>

export function useForm<T extends Record<string, unknown>>(initial: T, validate: Validator<T>) {
  const [values, setValues] = useState(initial)
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const errors: Errors<T> = attempted ? validate(values) : {}

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setFormError(null)
  }, [])

  function field<K extends keyof T & string>(key: K) {
    return {
      name: key,
      value: values[key] as string,
      error: errors[key],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(key, event.target.value as T[K]),
    }
  }

  function handleSubmit(onValid: (values: T) => Promise<void> | void) {
    return async (event: FormEvent) => {
      event.preventDefault()
      setAttempted(true)
      if (hasErrors(validate(values))) return

      setSubmitting(true)
      setFormError(null)
      try {
        await onValid(values)
      } catch (error) {
        setFormError(messageFor(error))
      } finally {
        setSubmitting(false)
      }
    }
  }

  return { values, errors, setValue, field, handleSubmit, submitting, formError }
}
