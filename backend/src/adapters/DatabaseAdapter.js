/**
 * Base Database Adapter Interface
 * All database adapters must implement these methods
 */
export class DatabaseAdapter {
  /**
   * Execute a SQL query with parameters
   * @param {Object} query - Query object with sql and args
   * @param {string} query.sql - SQL statement (with ? placeholders)
   * @param {Array} query.args - Query parameters
   * @returns {Promise<Object>} - Result with rows and rowsAffected
   */
  async execute(query) {
    throw new Error('execute() must be implemented by adapter');
  }

  /**
   * Close database connection
   */
  async close() {
    throw new Error('close() must be implemented by adapter');
  }

  /**
   * Begin transaction
   */
  async beginTransaction() {
    throw new Error('beginTransaction() must be implemented by adapter');
  }

  /**
   * Commit transaction
   */
  async commit() {
    throw new Error('commit() must be implemented by adapter');
  }

  /**
   * Rollback transaction
   */
  async rollback() {
    throw new Error('rollback() must be implemented by adapter');
  }

  /**
   * Get database type
   * @returns {string} - 'turso', 'mysql', etc.
   */
  getType() {
    throw new Error('getType() must be implemented by adapter');
  }
}
