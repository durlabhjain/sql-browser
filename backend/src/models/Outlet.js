import { getTursoClient } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

export class OutletModel {
  /**
   * Create a new outlet
   */
  static async create({ code, name, image }) {
    const db = getTursoClient();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    try {
      await db.execute({
        sql: `INSERT INTO outlets (id, code, name, image, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, code, name, image || null, createdAt, createdAt]
      });

      logger.info(`Outlet created: ${code} - ${name}`);

      return {
        id,
        code,
        name,
        image,
        createdAt
      };
    } catch (error) {
      logger.error('Error creating outlet:', error);
      throw error;
    }
  }

  /**
   * Find outlet by ID
   */
  static async findById(id) {
    const db = getTursoClient();

    try {
      const result = await db.execute({
        sql: 'SELECT * FROM outlets WHERE id = ?',
        args: [id]
      });

      if (result.rows.length === 0) {
        return null;
      }

      return this._mapOutlet(result.rows[0]);
    } catch (error) {
      logger.error('Error finding outlet by ID:', error);
      throw error;
    }
  }

  /**
   * Find outlet by code
   */
  static async findByCode(code) {
    const db = getTursoClient();

    try {
      const result = await db.execute({
        sql: 'SELECT * FROM outlets WHERE code = ?',
        args: [code]
      });

      if (result.rows.length === 0) {
        return null;
      }

      return this._mapOutlet(result.rows[0]);
    } catch (error) {
      logger.error('Error finding outlet by code:', error);
      throw error;
    }
  }

  /**
   * List outlets with pagination
   */
  static async list({ limit = 20, offset = 0, search = '' } = {}) {
    const db = getTursoClient();

    try {
      let sql = 'SELECT * FROM outlets';
      let countSql = 'SELECT COUNT(*) as total FROM outlets';
      const args = [];
      const countArgs = [];

      // Add search filter if provided
      if (search) {
        sql += ' WHERE code LIKE ? OR name LIKE ?';
        countSql += ' WHERE code LIKE ? OR name LIKE ?';
        const searchPattern = `%${search}%`;
        args.push(searchPattern, searchPattern);
        countArgs.push(searchPattern, searchPattern);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      args.push(limit, offset);

      // Get total count
      const countResult = await db.execute({
        sql: countSql,
        args: countArgs
      });
      const total = countResult.rows[0].total;

      // Get outlets
      const result = await db.execute({
        sql,
        args
      });

      return {
        outlets: result.rows.map(row => this._mapOutlet(row)),
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      };
    } catch (error) {
      logger.error('Error listing outlets:', error);
      throw error;
    }
  }

  /**
   * Update outlet
   */
  static async update(id, updates) {
    const db = getTursoClient();
    const updatedAt = new Date().toISOString();

    const allowedFields = ['code', 'name', 'image'];
    const setClauses = [];
    const args = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        args.push(value);
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
        sql: `UPDATE outlets SET ${setClauses.join(', ')} WHERE id = ?`,
        args
      });

      logger.info(`Outlet updated: ${id}`);
      return this.findById(id);
    } catch (error) {
      logger.error('Error updating outlet:', error);
      throw error;
    }
  }

  /**
   * Delete outlet
   */
  static async delete(id) {
    const db = getTursoClient();

    try {
      await db.execute({
        sql: 'DELETE FROM outlets WHERE id = ?',
        args: [id]
      });

      logger.info(`Outlet deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting outlet:', error);
      throw error;
    }
  }

  /**
   * Map database row to outlet object
   */
  static _mapOutlet(row) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      image: row.image,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Bulk create outlets (for seeding)
   */
  static async bulkCreate(outlets) {
    const db = getTursoClient();
    const createdAt = new Date().toISOString();

    try {
      for (const outlet of outlets) {
        const id = uuidv4();
        await db.execute({
          sql: `INSERT INTO outlets (id, code, name, image, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [id, outlet.code, outlet.name, outlet.image || null, createdAt, createdAt]
        });
      }

      logger.info(`Bulk created ${outlets.length} outlets`);
      return true;
    } catch (error) {
      logger.error('Error bulk creating outlets:', error);
      throw error;
    }
  }
}
