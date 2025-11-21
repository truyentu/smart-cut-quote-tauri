/**
 * Mock data for testing and demonstration
 * Materials and Machines for part configuration
 */

import { Material, Machine, Client } from '../types/quote';

/**
 * Material hierarchy structure for 3-level filtering
 */
export interface MaterialSpec {
  id: string;
  pricePerKg: number;
  density: number; // kg/m³
  cuttingSpeed: number; // mm/min
  pierceCost: number; // $ per pierce
}

export interface MaterialHierarchy {
  groups: {
    [groupName: string]: {
      grades: {
        [gradeName: string]: {
          thicknesses: {
            [thickness: number]: MaterialSpec;
          };
        };
      };
    };
  };
}

/**
 * 3-Level Material Data Structure
 * Level 1: Group (e.g., "Stainless Steel", "Mild Steel")
 * Level 2: Grade (e.g., "304", "201", "S235JR")
 * Level 3: Thickness (e.g., 0.9, 1, 1.5, 2, 3, 5)
 */
export const MATERIAL_HIERARCHY: MaterialHierarchy = {
  groups: {
    'Stainless Steel': {
      grades: {
        '304': {
          thicknesses: {
            0.9: {
              id: 'ss-304-0.9',
              pricePerKg: 5.2,
              density: 8000,
              cuttingSpeed: 2200,
              pierceCost: 0.6,
            },
            1: {
              id: 'ss-304-1',
              pricePerKg: 5.2,
              density: 8000,
              cuttingSpeed: 2200,
              pierceCost: 0.65,
            },
            1.5: {
              id: 'ss-304-1.5',
              pricePerKg: 5.1,
              density: 8000,
              cuttingSpeed: 2100,
              pierceCost: 0.7,
            },
            2: {
              id: 'ss-304-2',
              pricePerKg: 5.0,
              density: 8000,
              cuttingSpeed: 2000,
              pierceCost: 0.75,
            },
            3: {
              id: 'ss-304-3',
              pricePerKg: 5.0,
              density: 8000,
              cuttingSpeed: 2000,
              pierceCost: 0.75,
            },
            5: {
              id: 'ss-304-5',
              pricePerKg: 5.0,
              density: 8000,
              cuttingSpeed: 1800,
              pierceCost: 0.85,
            },
          },
        },
        '201': {
          thicknesses: {
            0.9: {
              id: 'ss-201-0.9',
              pricePerKg: 4.5,
              density: 7900,
              cuttingSpeed: 2300,
              pierceCost: 0.55,
            },
            1: {
              id: 'ss-201-1',
              pricePerKg: 4.5,
              density: 7900,
              cuttingSpeed: 2300,
              pierceCost: 0.6,
            },
            1.5: {
              id: 'ss-201-1.5',
              pricePerKg: 4.4,
              density: 7900,
              cuttingSpeed: 2200,
              pierceCost: 0.65,
            },
            2: {
              id: 'ss-201-2',
              pricePerKg: 4.3,
              density: 7900,
              cuttingSpeed: 2100,
              pierceCost: 0.7,
            },
            3: {
              id: 'ss-201-3',
              pricePerKg: 4.3,
              density: 7900,
              cuttingSpeed: 2100,
              pierceCost: 0.7,
            },
          },
        },
        '316': {
          thicknesses: {
            1: {
              id: 'ss-316-1',
              pricePerKg: 6.5,
              density: 8000,
              cuttingSpeed: 2000,
              pierceCost: 0.7,
            },
            1.5: {
              id: 'ss-316-1.5',
              pricePerKg: 6.4,
              density: 8000,
              cuttingSpeed: 1900,
              pierceCost: 0.75,
            },
            2: {
              id: 'ss-316-2',
              pricePerKg: 6.3,
              density: 8000,
              cuttingSpeed: 1900,
              pierceCost: 0.8,
            },
            3: {
              id: 'ss-316-3',
              pricePerKg: 6.3,
              density: 8000,
              cuttingSpeed: 1800,
              pierceCost: 0.85,
            },
          },
        },
      },
    },
    'Mild Steel': {
      grades: {
        'S235JR': {
          thicknesses: {
            0.9: {
              id: 'ms-s235jr-0.9',
              pricePerKg: 2.6,
              density: 7850,
              cuttingSpeed: 3200,
              pierceCost: 0.4,
            },
            1: {
              id: 'ms-s235jr-1',
              pricePerKg: 2.6,
              density: 7850,
              cuttingSpeed: 3200,
              pierceCost: 0.45,
            },
            1.5: {
              id: 'ms-s235jr-1.5',
              pricePerKg: 2.5,
              density: 7850,
              cuttingSpeed: 3100,
              pierceCost: 0.5,
            },
            2: {
              id: 'ms-s235jr-2',
              pricePerKg: 2.5,
              density: 7850,
              cuttingSpeed: 3000,
              pierceCost: 0.5,
            },
            3: {
              id: 'ms-s235jr-3',
              pricePerKg: 2.5,
              density: 7850,
              cuttingSpeed: 3000,
              pierceCost: 0.5,
            },
            5: {
              id: 'ms-s235jr-5',
              pricePerKg: 2.5,
              density: 7850,
              cuttingSpeed: 2500,
              pierceCost: 0.6,
            },
            6: {
              id: 'ms-s235jr-6',
              pricePerKg: 2.5,
              density: 7850,
              cuttingSpeed: 2400,
              pierceCost: 0.65,
            },
            8: {
              id: 'ms-s235jr-8',
              pricePerKg: 2.5,
              density: 7850,
              cuttingSpeed: 2200,
              pierceCost: 0.7,
            },
            10: {
              id: 'ms-s235jr-10',
              pricePerKg: 2.5,
              density: 7850,
              cuttingSpeed: 2000,
              pierceCost: 0.8,
            },
          },
        },
        'S275JR': {
          thicknesses: {
            1: {
              id: 'ms-s275jr-1',
              pricePerKg: 2.7,
              density: 7850,
              cuttingSpeed: 3100,
              pierceCost: 0.45,
            },
            1.5: {
              id: 'ms-s275jr-1.5',
              pricePerKg: 2.7,
              density: 7850,
              cuttingSpeed: 3000,
              pierceCost: 0.5,
            },
            2: {
              id: 'ms-s275jr-2',
              pricePerKg: 2.6,
              density: 7850,
              cuttingSpeed: 2900,
              pierceCost: 0.55,
            },
            3: {
              id: 'ms-s275jr-3',
              pricePerKg: 2.6,
              density: 7850,
              cuttingSpeed: 2900,
              pierceCost: 0.55,
            },
            5: {
              id: 'ms-s275jr-5',
              pricePerKg: 2.6,
              density: 7850,
              cuttingSpeed: 2400,
              pierceCost: 0.65,
            },
          },
        },
      },
    },
    'Aluminum': {
      grades: {
        '6061-T6': {
          thicknesses: {
            1: {
              id: 'al-6061-1',
              pricePerKg: 4.2,
              density: 2700,
              cuttingSpeed: 4500,
              pierceCost: 0.25,
            },
            1.5: {
              id: 'al-6061-1.5',
              pricePerKg: 4.1,
              density: 2700,
              cuttingSpeed: 4300,
              pierceCost: 0.28,
            },
            2: {
              id: 'al-6061-2',
              pricePerKg: 4.0,
              density: 2700,
              cuttingSpeed: 4200,
              pierceCost: 0.3,
            },
            3: {
              id: 'al-6061-3',
              pricePerKg: 4.0,
              density: 2700,
              cuttingSpeed: 4000,
              pierceCost: 0.3,
            },
            5: {
              id: 'al-6061-5',
              pricePerKg: 4.0,
              density: 2700,
              cuttingSpeed: 4000,
              pierceCost: 0.3,
            },
          },
        },
        '5052': {
          thicknesses: {
            1: {
              id: 'al-5052-1',
              pricePerKg: 3.8,
              density: 2680,
              cuttingSpeed: 4600,
              pierceCost: 0.25,
            },
            1.5: {
              id: 'al-5052-1.5',
              pricePerKg: 3.7,
              density: 2680,
              cuttingSpeed: 4400,
              pierceCost: 0.28,
            },
            2: {
              id: 'al-5052-2',
              pricePerKg: 3.6,
              density: 2680,
              cuttingSpeed: 4300,
              pierceCost: 0.3,
            },
            3: {
              id: 'al-5052-3',
              pricePerKg: 3.6,
              density: 2680,
              cuttingSpeed: 4100,
              pierceCost: 0.3,
            },
          },
        },
      },
    },
  },
};

/**
 * Helper functions for material hierarchy
 */
export const getMaterialGroups = (): string[] => {
  return Object.keys(MATERIAL_HIERARCHY.groups);
};

export const getMaterialGrades = (group: string): string[] => {
  return Object.keys(MATERIAL_HIERARCHY.groups[group]?.grades || {});
};

export const getMaterialThicknesses = (group: string, grade: string): number[] => {
  const thicknesses = MATERIAL_HIERARCHY.groups[group]?.grades[grade]?.thicknesses;
  return thicknesses ? Object.keys(thicknesses).map(Number).sort((a, b) => a - b) : [];
};

export const getMaterialSpec = (
  group: string,
  grade: string,
  thickness: number
): MaterialSpec | null => {
  return MATERIAL_HIERARCHY.groups[group]?.grades[grade]?.thicknesses[thickness] || null;
};

/**
 * Legacy materials array (backward compatible)
 * Auto-generated from hierarchy for components that still use the old format
 */
export const MOCK_MATERIALS: Material[] = (() => {
  const materials: Material[] = [];
  const groups = MATERIAL_HIERARCHY.groups;

  Object.entries(groups).forEach(([groupName, groupData]) => {
    Object.entries(groupData.grades).forEach(([gradeName, gradeData]) => {
      Object.entries(gradeData.thicknesses).forEach(([thickness, spec]) => {
        materials.push({
          id: spec.id,
          name: groupName,
          grade: gradeName,
          thickness: Number(thickness),
          pricePerKg: spec.pricePerKg,
          density: spec.density,
          cuttingSpeed: spec.cuttingSpeed,
          pierceCost: spec.pierceCost,
          cutPricePerMeter: 1.50, // Default value for mock data
        });
      });
    });
  });

  return materials;
})();

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

/**
 * Dashboard Quote interface
 */
export interface DashboardQuote {
  id: string;
  quoteNo: string;
  clientName: string;
  company: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  productionStatus?: 'in_production' | 'completed' | null;
  date: string;
  createdBy: string;
}

/**
 * Mock quotes for dashboard
 */
export const MOCK_QUOTES: DashboardQuote[] = [
  {
    id: 'q-1',
    quoteNo: 'Q-2025-001',
    clientName: 'John Smith',
    company: 'ABC Manufacturing Co.',
    amount: 2850.5,
    status: 'Pending',
    date: '10/11/2025',
    createdBy: 'ADMIN',
  },
  {
    id: 'q-2',
    quoteNo: 'Q-2025-002',
    clientName: 'Sarah Johnson',
    company: 'TechParts Industries',
    amount: 4200.0,
    status: 'Accepted',
    date: '12/11/2025',
    createdBy: 'NS',
  },
  {
    id: 'q-3',
    quoteNo: 'Q-2025-003',
    clientName: 'Michael Chen',
    company: 'Precision Engineering Ltd.',
    amount: 1750.25,
    status: 'Pending',
    date: '13/11/2025',
    createdBy: 'ADMIN',
  },
  {
    id: 'q-4',
    quoteNo: 'Q-2025-004',
    clientName: 'Emily Rodriguez',
    company: 'MetalWorks Solutions',
    amount: 5600.0,
    status: 'Accepted',
    date: '14/11/2025',
    createdBy: 'JD',
  },
  {
    id: 'q-5',
    quoteNo: 'Q-2025-005',
    clientName: 'David Thompson',
    company: 'Industrial Fabricators Inc.',
    amount: 3300.75,
    status: 'Pending',
    date: '15/11/2025',
    createdBy: 'ADMIN',
  },
  {
    id: 'q-6',
    quoteNo: 'Q-2025-006',
    clientName: 'John Smith',
    company: 'ABC Manufacturing Co.',
    amount: 1950.0,
    status: 'Accepted',
    date: '15/11/2025',
    createdBy: 'NS',
  },
  {
    id: 'q-7',
    quoteNo: 'Q-2025-007',
    clientName: 'Sarah Johnson',
    company: 'TechParts Industries',
    amount: 2400.5,
    status: 'Pending',
    date: '16/11/2025',
    createdBy: 'ADMIN',
  },
  {
    id: 'q-8',
    quoteNo: 'Q-2025-008',
    clientName: 'Michael Chen',
    company: 'Precision Engineering Ltd.',
    amount: 3800.0,
    status: 'Accepted',
    date: '16/11/2025',
    createdBy: 'JD',
  },
  {
    id: 'q-9',
    quoteNo: 'Q-2025-009',
    clientName: 'Emily Rodriguez',
    company: 'MetalWorks Solutions',
    amount: 2100.25,
    status: 'Pending',
    date: '16/11/2025',
    createdBy: 'NS',
  },
  {
    id: 'q-10',
    quoteNo: 'Q-2025-010',
    clientName: 'David Thompson',
    company: 'Industrial Fabricators Inc.',
    amount: 4750.0,
    status: 'Accepted',
    date: '16/11/2025',
    createdBy: 'ADMIN',
  },
];

/**
 * Chart data interface
 */
export interface ChartData {
  month: string;
  quotes: number;
  revenue: number;
}

/**
 * Mock chart data for statistics
 */
export const MOCK_CHART_DATA: ChartData[] = [
  { month: 'Jan', quotes: 12, revenue: 28500 },
  { month: 'Feb', quotes: 15, revenue: 35200 },
  { month: 'Mar', quotes: 18, revenue: 42100 },
  { month: 'Apr', quotes: 14, revenue: 31800 },
  { month: 'May', quotes: 20, revenue: 48300 },
  { month: 'Jun', quotes: 22, revenue: 52400 },
  { month: 'Jul', quotes: 19, revenue: 45600 },
  { month: 'Aug', quotes: 25, revenue: 59200 },
  { month: 'Sep', quotes: 23, revenue: 54700 },
  { month: 'Oct', quotes: 21, revenue: 49800 },
  { month: 'Nov', quotes: 10, revenue: 32650 },
];
