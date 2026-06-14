export default [
  {
    test: {
      name: 'unit',
      include: ['tests/unit/**/*.test.ts']
    }
  },
  {
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.test.ts']
    }
  },
  {
    test: {
      name: 'property',
      include: ['tests/property/**/*.test.ts']
    }
  }
];
