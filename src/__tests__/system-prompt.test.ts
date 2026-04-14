import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompts/system.js';

describe('buildSystemPrompt', () => {
  it('returns a non-empty string for each detail level', () => {
    for (const detail of ['minimal', 'standard', 'full'] as const) {
      const prompt = buildSystemPrompt(detail);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    }
  });

  it('standard prompt includes all standard item fields', () => {
    const prompt = buildSystemPrompt('standard');
    expect(prompt).toContain('"description"');
    expect(prompt).toContain('"quantity"');
    expect(prompt).toContain('"unitPrice"');
    expect(prompt).toContain('"totalPrice"');
    expect(prompt).toContain('"sku"');
    expect(prompt).toContain('"category"');
    expect(prompt).toContain('"isVoided"');
    expect(prompt).toContain('"productType"');
  });

  it('full prompt includes extended item fields', () => {
    const prompt = buildSystemPrompt('full');
    expect(prompt).toContain('"barcode"');
    expect(prompt).toContain('"brand"');
    expect(prompt).toContain('"discountLabel"');
    expect(prompt).toContain('"notes"');
  });

  it('minimal prompt omits extended fields', () => {
    const prompt = buildSystemPrompt('minimal');
    expect(prompt).not.toContain('"sku"');
    expect(prompt).not.toContain('"barcode"');
    expect(prompt).not.toContain('"brand"');
    expect(prompt).not.toContain('"unitPrice"');
  });

  it('all prompts include receiptType field', () => {
    for (const detail of ['minimal', 'standard', 'full'] as const) {
      expect(buildSystemPrompt(detail)).toContain('"receiptType"');
    }
  });

  it('all prompts include productType field', () => {
    for (const detail of ['minimal', 'standard', 'full'] as const) {
      expect(buildSystemPrompt(detail)).toContain('"productType"');
    }
  });

  describe('with productTypes list', () => {
    it('inlines allowed values as a union in the schema', () => {
      const prompt = buildSystemPrompt('standard', ['beverages', 'food', 'dairy']);
      expect(prompt).toContain('"beverages"');
      expect(prompt).toContain('"food"');
      expect(prompt).toContain('"dairy"');
    });

    it('works for all detail levels', () => {
      const list = ['snacks', 'household'];
      for (const detail of ['minimal', 'standard', 'full'] as const) {
        const prompt = buildSystemPrompt(detail, list);
        expect(prompt).toContain('"snacks"');
        expect(prompt).toContain('"household"');
      }
    });
  });

  describe('without productTypes list', () => {
    it('includes free-classification hint', () => {
      const prompt = buildSystemPrompt('standard');
      expect(prompt).toContain('classify freely');
    });
  });

  it('defaults to standard when detail is omitted', () => {
    const withDefault = buildSystemPrompt();
    const withStandard = buildSystemPrompt('standard');
    expect(withDefault).toBe(withStandard);
  });
});
