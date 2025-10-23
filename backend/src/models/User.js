import { getTursoClient } from '../config/database.js';
import { hashPassword, verifyPassword } from '../utils/encryption.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

export class UserModel {
  /**
   * Create a new user
   */
  static async create({ username, password, email, role, isActive = true }) {
    const db = getTursoClient();
    const id = uuidv4();
    const passwordHash = hashPassword(password);
    const createdAt = new Date().toISOString();

    try {
      await db.execute({
        sql: `INSERT INTO users (id, username, password_hash, email, role, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, username, passwordHash, email || null, role, isActive ? 1 : 0, createdAt, createdAt]
      });

      logger.info(`User created: ${username} (${role})`);

      return {
        id,
        username,
        email,
        role,
        isActive,
        createdAt
      };
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const db = getTursoClient();

    try {
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [id]
      });

      if (result.rows.length === 0) {
        return null;
      }

      return this._mapUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const db = getTursoClient();

    try {
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE username = ?',
        args: [username]
      });

      if (result.rows.length === 0) {
        return null;
      }

      return this._mapUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Verify user credentials
   */
  static async verifyCredentials(username, password) {
    const user = await this.findByUsername(username);

    if (!user || !user.isActive) {
      return null;
    }

    const isValid = verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return null;
    }

    // Don't return password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * List all users
   */
  static async list({ limit = 50, offset = 0 } = {}) {
    const db = getTursoClient();

    try {
      const result = await db.execute({
        sql: 'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
        args: [limit, offset]
      });

      return result.rows.map(row => {
        const user = this._mapUser(row);
        delete user.passwordHash;
        return user;
      });
    } catch (error) {
      logger.error('Error listing users:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  static async update(id, updates) {
    const db = getTursoClient();
    const updatedAt = new Date().toISOString();

    const allowedFields = ['username', 'email', 'role', 'isActive', 'password'];
    const setClauses = [];
    const args = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'password') {
          setClauses.push('password_hash = ?');
          args.push(hashPassword(value));
        } else if (key === 'isActive') {
          setClauses.push('is_active = ?');
          args.push(value ? 1 : 0);
        } else {
          setClauses.push(`${this._toSnakeCase(key)} = ?`);
          args.push(value);
        }
      }
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    setClauses.push('updated_at = ?');
    args.push(updatedAt);
    args.push(id);

    try {
      await db.execute({
        sql: `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
        args
      });

      logger.info(`User updated: ${id}`);
      return this.findById(id);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  static async delete(id) {
    const db = getTursoClient();

    try {
      await db.execute({
        sql: 'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?',
        args: [new Date().toISOString(), id]
      });

      logger.info(`User deleted (soft): ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Hard delete user (use with caution)
   */
  static async hardDelete(id) {
    const db = getTursoClient();

    try {
      await db.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [id]
      });

      logger.info(`User hard deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error hard deleting user:', error);
      throw error;
    }
  }

  /**
   * Map database row to user object
   */
  static _mapUser(row) {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      email: row.email,
      role: row.role,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  static _toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(id) {
    const db = getTursoClient();

    try {
      await db.execute({
        sql: 'UPDATE users SET last_login_at = ? WHERE id = ?',
        args: [new Date().toISOString(), id]
      });
    } catch (error) {
      logger.error('Error updating last login:', error);
    }
  }
}
