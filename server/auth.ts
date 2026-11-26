import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';

let dataDir = path.resolve(process.cwd(), 'data');
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.accessSync(dataDir, fs.constants.W_OK);
} catch {
  dataDir = path.join(os.tmpdir(), 'leia-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const dbPath = path.join(dataDir, 'leia-auth.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'estudiante',
    education_level TEXT NOT NULL DEFAULT 'secundaria',
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'estudiante' | 'docente';
  educationLevel: 'secundaria' | 'superior';
  createdAt: string;
}

export interface AuthenticatedRequest extends Request {
  user?: PublicUser;
  sessionTokenHash?: string;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHashHex: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(storedHashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSessionForUser(userId: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  // Clean expired sessions opportunistically
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(tokenHash, userId, expiresAt, now);

  return rawToken;
}

function mapUserRow(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role === 'docente' ? 'docente' : 'estudiante',
    educationLevel: row.education_level === 'superior' ? 'superior' : 'secundaria',
    createdAt: String(row.created_at),
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role?: string;
  educationLevel?: string;
}): { token: string; user: PublicUser } {
  const cleanName = String(input.name || '').trim().slice(0, 80);
  const cleanEmail = String(input.email || '').trim().toLowerCase().slice(0, 160);
  const password = String(input.password || '');
  const role: 'estudiante' | 'docente' = input.role === 'docente' ? 'docente' : 'estudiante';
  const educationLevel: 'secundaria' | 'superior' =
    input.educationLevel === 'superior' ? 'superior' : 'secundaria';

  if (cleanName.length < 2) {
    throw new AuthError(400, 'Ingresa tu nombre completo (mínimo 2 caracteres).');
  }
  if (!isValidEmail(cleanEmail)) {
    throw new AuthError(400, 'Ingresa un correo electrónico válido.');
  }
  if (password.length < 6 || password.length > 128) {
    throw new AuthError(400, 'La contraseña debe tener entre 6 y 128 caracteres.');
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    throw new AuthError(409, 'Ya existe una cuenta registrada con este correo electrónico.');
  }

  const userId = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');
  const pwHash = hashPassword(password, salt);
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, name, email, role, education_level, password_salt, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, cleanName, cleanEmail, role, educationLevel, salt, pwHash, createdAt);

  const token = createSessionForUser(userId);
  const user: PublicUser = {
    id: userId,
    name: cleanName,
    email: cleanEmail,
    role,
    educationLevel,
    createdAt,
  };

  return { token, user };
}

export function loginUser(input: {
  email: string;
  password: string;
}): { token: string; user: PublicUser } {
  const cleanEmail = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');

  if (!cleanEmail || !password) {
    throw new AuthError(400, 'Ingresa tu correo y contraseña.');
  }

  const row = db
    .prepare(
      'SELECT id, name, email, role, education_level, password_salt, password_hash, created_at FROM users WHERE email = ?'
    )
    .get(cleanEmail) as Record<string, unknown> | undefined;

  if (!row) {
    throw new AuthError(401, 'Correo electrónico o contraseña incorrectos.');
  }

  const valid = verifyPassword(
    password,
    String(row.password_salt),
    String(row.password_hash)
  );
  if (!valid) {
    throw new AuthError(401, 'Correo electrónico o contraseña incorrectos.');
  }

  const user = mapUserRow(row);
  const token = createSessionForUser(user.id);
  return { token, user };
}

export function deleteSessionByHash(tokenHash: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+([A-Za-z0-9_-]{32,256})$/);

  if (!match) {
    res.status(401).json({
      error: 'Debes crear una cuenta o iniciar sesión en LEIA para usar las funciones de IA.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const rawToken = match[1];
  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();

  const sessionRow = db
    .prepare(
      `SELECT s.token_hash, s.expires_at, u.id, u.name, u.email, u.role, u.education_level, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as Record<string, unknown> | undefined;

  if (!sessionRow || Number(sessionRow.expires_at) < now) {
    if (sessionRow) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    }
    res.status(401).json({
      error: 'Tu sesión expiró o no es válida. Inicia sesión nuevamente para continuar con la IA.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  req.user = mapUserRow(sessionRow);
  req.sessionTokenHash = tokenHash;
  next();
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
