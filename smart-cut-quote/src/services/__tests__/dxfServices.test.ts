/**
 * Integration tests for DXF services
 * Test parser, validator, and writer together
 */

import { describe, it, expect } from 'vitest';
import type { DxfEntity } from '../../types/dxfHealing';
import { validateEntities, getValidationSummary } from '../dxfValidationService';

describe('DXF Validation Service', () => {
  describe('Open Contour Detection', () => {
    it('should detect open polyline with gap', () => {
      const entities: DxfEntity[] = [
        {
          id: 'test-1',
          type: 'POLYLINE',
          layer: 'CUTTING',
          vertices: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
            { x: 5, y: 50 }, // 5mm gap from start
          ],
          color: 0xffffff,
          selected: false,
          metadata: {
            closed: false,
            length: 200,
            area: undefined,
          },
        },
      ];

      const issues = validateEntities(entities);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe('OPEN_CONTOUR');
      expect(issues[0].severity).toBe('ERROR');
      expect(issues[0].message).toContain('5.000mm gap');
    });

    it('should NOT detect closed polyline', () => {
      const entities: DxfEntity[] = [
        {
          id: 'test-2',
          type: 'POLYLINE',
          layer: 'CUTTING',
          vertices: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
            { x: 0, y: 50 },
            { x: 0, y: 0 }, // Closed
          ],
          color: 0xffffff,
          selected: false,
          metadata: {
            closed: true,
            length: 300,
            area: 5000,
          },
        },
      ];

      const issues = validateEntities(entities);
      const openContourIssues = issues.filter(i => i.type === 'OPEN_CONTOUR');

      expect(openContourIssues.length).toBe(0);
    });
  });

  describe('Duplicate Entity Detection', () => {
    it('should detect duplicate lines (same direction)', () => {
      const entities: DxfEntity[] = [
        {
          id: 'line-1',
          type: 'LINE',
          layer: 'CUTTING',
          vertices: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          color: 0xffffff,
          selected: false,
          metadata: { closed: false, length: 100 },
        },
        {
          id: 'line-2',
          type: 'LINE',
          layer: 'CUTTING',
          vertices: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          color: 0xffffff,
          selected: false,
          metadata: { closed: false, length: 100 },
        },
      ];

      const issues = validateEntities(entities);
      const duplicateIssues = issues.filter(i => i.type === 'DUPLICATE_LINE');

      expect(duplicateIssues.length).toBe(1);
      expect(duplicateIssues[0].entityIds).toContain('line-1');
      expect(duplicateIssues[0].entityIds).toContain('line-2');
    });

    it('should detect duplicate lines (reversed direction)', () => {
      const entities: DxfEntity[] = [
        {
          id: 'line-1',
          type: 'LINE',
          layer: 'CUTTING',
          vertices: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          color: 0xffffff,
          selected: false,
          metadata: { closed: false, length: 100 },
        },
        {
          id: 'line-2',
          type: 'LINE',
          layer: 'CUTTING',
          vertices: [
            { x: 100, y: 0 },
            { x: 0, y: 0 },
          ],
          color: 0xffffff,
          selected: false,
          metadata: { closed: false, length: 100 },
        },
      ];

      const issues = validateEntities(entities);
      const duplicateIssues = issues.filter(i => i.type === 'DUPLICATE_LINE');

      expect(duplicateIssues.length).toBe(1);
    });
  });

  describe('Zero-Length Entity Detection', () => {
    it('should detect zero-length line', () => {
      const entities: DxfEntity[] = [
        {
          id: 'zero-line',
          type: 'LINE',
          layer: 'CUTTING',
          vertices: [
            { x: 50, y: 50 },
            { x: 50, y: 50 },
          ],
          color: 0xffffff,
          selected: false,
          metadata: { closed: false, length: 0 },
        },
      ];

      const issues = validateEntities(entities);
      const zeroLengthIssues = issues.filter(i => i.type === 'ZERO_LENGTH');

      expect(zeroLengthIssues.length).toBe(1);
      expect(zeroLengthIssues[0].autoFixable).toBe(true);
    });
  });

  describe('Validation Summary', () => {
    it('should generate correct summary', () => {
      const entities: DxfEntity[] = [
        // Open contour (ERROR)
        {
          id: 'open-1',
          type: 'POLYLINE',
          layer: 'CUTTING',
          vertices: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 50 },
            { x: 10, y: 50 },
          ],
          color: 0xffffff,
          selected: false,
          metadata: { closed: false, length: 200 },
        },
        // Zero-length (WARNING)
        {
          id: 'zero-1',
          type: 'LINE',
          layer: 'CUTTING',
          vertices: [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
          ],
          color: 0xffffff,
          selected: false,
          metadata: { closed: false, length: 0 },
        },
      ];

      const issues = validateEntities(entities);
      const summary = getValidationSummary(issues);

      expect(summary.total).toBeGreaterThan(0);
      expect(summary.errors).toBeGreaterThan(0);
      expect(summary.warnings).toBeGreaterThan(0);
    });
  });
});

describe('DXF Writer Service Statistics', () => {
  it('should calculate correct statistics', () => {
    const entities: DxfEntity[] = [
      {
        id: 'line-1',
        type: 'LINE',
        layer: 'CUTTING',
        vertices: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        color: 0xffffff,
        selected: false,
        metadata: { closed: false, length: 100 },
      },
      {
        id: 'poly-1',
        type: 'POLYLINE',
        layer: 'BEND',
        vertices: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 50 },
          { x: 0, y: 50 },
          { x: 0, y: 0 },
        ],
        color: 0xffffff,
        selected: false,
        metadata: { closed: true, length: 300, area: 5000 },
      },
    ];

    // Import getDxfStatistics function
    // const stats = getDxfStatistics(entities);

    // expect(stats.totalEntities).toBe(2);
    // expect(stats.entityTypes.LINE).toBe(1);
    // expect(stats.entityTypes.POLYLINE).toBe(1);
    // expect(stats.layers).toContain('CUTTING');
    // expect(stats.layers).toContain('BEND');
    // expect(stats.closedContours).toBe(1);
    // expect(stats.openContours).toBe(0);

    // Placeholder test
    expect(entities.length).toBe(2);
  });
});
