export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Fallo de red (sin respuesta del servidor). */
export class NetworkError extends Error {
  constructor(message = "network_error") {
    super(message);
    this.name = "NetworkError";
  }
}

/** La sesión no se pudo renovar: el usuario debe volver a iniciar sesión. */
export class AuthExpiredError extends Error {
  constructor() {
    super("auth_expired");
    this.name = "AuthExpiredError";
  }
}

/** Errores que justifican guardar la lectura en la cola y reintentar. */
export function isRetryable(e: unknown): boolean {
  return e instanceof NetworkError || (e instanceof ApiError && e.status >= 500);
}
