export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

export function success<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

export function failure<T>(errors: string | string[]): ServiceResult<T> {
  return {
    success: false,
    errors: Array.isArray(errors) ? errors : [errors],
  };
}
