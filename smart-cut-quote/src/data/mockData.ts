/**
 * Mock data for testing and demonstration
 * Materials and Machines for part configuration
 */

import { Material, Machine, Client } from '../types/quote';

/**
 * Mock materials with various properties
 */
export const MOCK_MATERIALS: Material[] = [
  {
    id: 'steel-mild-3mm',
    name: 'Mild Steel',
    grade: 'S235JR',
    thickness: 3,
    pricePerKg: 2.5,
    density: 7850, // kg/m³
    cuttingSpeed: 3000, // mm/min
    pierceCost: 0.5, // $ per pierce
  },
  {
    id: 'steel-stainless-3mm',
    name: 'Stainless Steel',
    grade: '304',
    thickness: 3,
    pricePerKg: 5.0,
    density: 8000,
    cuttingSpeed: 2000,
    pierceCost: 0.75,
  },
  {
    id: 'aluminum-5mm',
    name: 'Aluminum',
    grade: '6061-T6',
    thickness: 5,
    pricePerKg: 4.0,
    density: 2700,
    cuttingSpeed: 4000,
    pierceCost: 0.3,
  },
  {
    id: 'steel-mild-5mm',
    name: 'Mild Steel',
    grade: 'S235JR',
    thickness: 5,
    pricePerKg: 2.5,
    density: 7850,
    cuttingSpeed: 2500,
    pierceCost: 0.6,
  },
  {
    id: 'steel-stainless-5mm',
    name: 'Stainless Steel',
    grade: '304',
    thickness: 5,
    pricePerKg: 5.0,
    density: 8000,
    cuttingSpeed: 1800,
    pierceCost: 0.85,
  },
];

/**
 * Mock machines with different capabilities and rates
 */
export const MOCK_MACHINES: Machine[] = [
  {
    id: 'laser-1',
    name: 'Laser Cutter 1',
    hourlyRate: 80, // $ per hour
    maxSheetWidth: 3000, // mm
    maxSheetHeight: 1500, // mm
  },
  {
    id: 'laser-2',
    name: 'Laser Cutter 2',
    hourlyRate: 100,
    maxSheetWidth: 4000,
    maxSheetHeight: 2000,
  },
  {
    id: 'plasma-1',
    name: 'Plasma Cutter 1',
    hourlyRate: 60,
    maxSheetWidth: 6000,
    maxSheetHeight: 3000,
  },
  {
    id: 'waterjet-1',
    name: 'Waterjet Cutter 1',
    hourlyRate: 120,
    maxSheetWidth: 3000,
    maxSheetHeight: 2000,
  },
];

/**
 * Mock clients for client selection
 */
export const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'John Smith',
    company: 'ABC Manufacturing Co.',
    email: 'john.smith@abcmfg.com',
    phone: '+1 (555) 123-4567',
  },
  {
    id: 'client-2',
    name: 'Sarah Johnson',
    company: 'TechParts Industries',
    email: 'sarah.j@techparts.com',
    phone: '+1 (555) 234-5678',
  },
  {
    id: 'client-3',
    name: 'Michael Chen',
    company: 'Precision Engineering Ltd.',
    email: 'm.chen@precision-eng.com',
    phone: '+1 (555) 345-6789',
  },
  {
    id: 'client-4',
    name: 'Emily Rodriguez',
    company: 'MetalWorks Solutions',
    email: 'e.rodriguez@metalworks.com',
    phone: '+1 (555) 456-7890',
  },
  {
    id: 'client-5',
    name: 'David Thompson',
    company: 'Industrial Fabricators Inc.',
    email: 'david.t@indfab.com',
    phone: '+1 (555) 567-8901',
  },
];
