/**
 * Database Services
 * Central export for all database operations
 */

// Connection
export * from './connection';
export { default as dbConnection } from './connection';

// Types
export * from './types';

// Repositories
export * from './settingsRepository';
export { default as settingsRepository } from './settingsRepository';

export * from './materialRepository';
export { default as materialRepository } from './materialRepository';

export * from './machineRepository';
export { default as machineRepository } from './machineRepository';

export * from './operationRepository';
export { default as operationRepository } from './operationRepository';

export * from './clientRepository';
export { default as clientRepository } from './clientRepository';

export * from './quoteRepository';
export { default as quoteRepository } from './quoteRepository';

// Convenience re-exports
import { getDatabase, closeDatabase } from './connection';
import { getAppSettings, updateAppSettings, getCompanyInfo, updateCompanyInfo } from './settingsRepository';
import { getAllMaterials, getMaterialById, createMaterial, updateMaterial, deleteMaterial } from './materialRepository';
import { getAllMachines, getMachineById, createMachine, updateMachine, deleteMachine } from './machineRepository';
import { getAllOperations, getOperationById, createOperation, updateOperation, deleteOperation } from './operationRepository';
import { getAllClients, getClientById, createClient, updateClient, deleteClient, searchClients } from './clientRepository';
import { getAllQuotes, getQuoteById, createQuote, updateQuote, deleteQuote, searchQuotes, getQuoteStats } from './quoteRepository';

/**
 * Database service object with all common operations
 */
export const db = {
  // Connection
  connect: getDatabase,
  close: closeDatabase,

  // Settings
  getSettings: getAppSettings,
  updateSettings: updateAppSettings,
  getCompanyInfo,
  updateCompanyInfo,

  // Materials
  materials: {
    getAll: getAllMaterials,
    getById: getMaterialById,
    create: createMaterial,
    update: updateMaterial,
    delete: deleteMaterial,
  },

  // Machines
  machines: {
    getAll: getAllMachines,
    getById: getMachineById,
    create: createMachine,
    update: updateMachine,
    delete: deleteMachine,
  },

  // Operations
  operations: {
    getAll: getAllOperations,
    getById: getOperationById,
    create: createOperation,
    update: updateOperation,
    delete: deleteOperation,
  },

  // Clients
  clients: {
    getAll: getAllClients,
    getById: getClientById,
    create: createClient,
    update: updateClient,
    delete: deleteClient,
    search: searchClients,
  },

  // Quotes
  quotes: {
    getAll: getAllQuotes,
    getById: getQuoteById,
    create: createQuote,
    update: updateQuote,
    delete: deleteQuote,
    search: searchQuotes,
    getStats: getQuoteStats,
  },
};

export default db;
