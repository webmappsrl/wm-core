// Mock dell'istanza di localforage
const mockLocalForageInstance = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  clear: jest.fn().mockResolvedValue(null),
  length: jest.fn().mockResolvedValue(0),
  key: jest.fn().mockResolvedValue(null),
  iterate: jest.fn().mockResolvedValue(null),
  keys: jest.fn().mockResolvedValue([]),
  ready: jest.fn().mockResolvedValue(null),
  defineDriver: jest.fn().mockResolvedValue(null),
  driver: jest.fn().mockReturnValue('asyncStorage'),
  setDriver: jest.fn().mockResolvedValue(null),
  config: jest.fn().mockReturnValue({
    name: 'test-db',
    storeName: 'test-store',
    description: 'Test database'
  })
};

// Mock principale di localforage
const mockLocalForage = {
  createInstance: jest.fn(() => mockLocalForageInstance),
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  clear: jest.fn().mockResolvedValue(null),
  length: jest.fn().mockResolvedValue(0),
  key: jest.fn().mockResolvedValue(null),
  iterate: jest.fn().mockResolvedValue(null),
  keys: jest.fn().mockResolvedValue([]),
  ready: jest.fn().mockResolvedValue(null),
  defineDriver: jest.fn().mockResolvedValue(null),
  driver: jest.fn().mockReturnValue('asyncStorage'),
  setDriver: jest.fn().mockResolvedValue(null),
  config: jest.fn().mockReturnValue({
    name: 'test-db',
    storeName: 'test-store',
    description: 'Test database'
  }),
  // Proprietà statiche
  INDEXEDDB: 'asyncStorage',
  WEBSQL: 'webSQLStorage',
  LOCALSTORAGE: 'localStorageWrapper'
};

// Esporta il mock come default
export default mockLocalForage;

// Esporta anche come named export per compatibilità
export const createInstance = mockLocalForage.createInstance;
export const getItem = mockLocalForage.getItem;
export const setItem = mockLocalForage.setItem;
export const removeItem = mockLocalForage.removeItem;
export const clear = mockLocalForage.clear;
export const length = mockLocalForage.length;
export const key = mockLocalForage.key;
export const iterate = mockLocalForage.iterate;
export const keys = mockLocalForage.keys;
export const ready = mockLocalForage.ready;
export const defineDriver = mockLocalForage.defineDriver;
export const driver = mockLocalForage.driver;
export const setDriver = mockLocalForage.setDriver;
export const config = mockLocalForage.config;
