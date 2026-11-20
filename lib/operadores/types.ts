/** Vista de un perfil de operador. */
export interface Operador {
  id: string;
  nombre: string;
  color: string;
  activo: boolean;
  creadoAt: string | null;
  ultimoUsoAt: string | null;
}
