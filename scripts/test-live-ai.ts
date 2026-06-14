import fs from 'fs';
import path from 'path';
import { generateText } from 'ai';

// --- Environment Loader ---
function loadManualEnv() {
  const envPath = path.join(process.cwd(), 'env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index === -1) continue;
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadManualEnv();

// Sync GEMINI/GOOGLE keys
if (!process.env.GOOGLE_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}
if (process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_API_KEY;
}

// Now we can import the project providers and waterfall
import { ProviderRegistry } from '../src/lib/ai/providers';
import { BudgetManager } from '../src/lib/ai/budget-manager';
import { executeWaterfall } from '../src/lib/ai/waterfall';
import { ProviderName } from '../src/lib/ai/types';

// ANSI Console Colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const WHITE_ON_BLUE = '\x1b[37;44m';

async function runDiagnostics() {
  console.log(`\n${WHITE_ON_BLUE} =================================================== ${RESET}`);
  console.log(`${WHITE_ON_BLUE}      MEDPROMPT AI PROVIDERS DIAGNOSTIC ENGINE       ${RESET}`);
  console.log(`${WHITE_ON_BLUE} =================================================== ${RESET}\n`);

  const registry = new ProviderRegistry();
  const budgetManager = new BudgetManager(registry);
  const providers = registry.getWaterfallOrder();

  console.log(`${BOLD}1. CREDENTIAL DETECTION STAGE${RESET}`);
  console.log('-------------------------------------');
  const keyMapping: Record<ProviderName, string> = {
    groq: 'GROQ_API_KEY',
    cerebras: 'CEREBRAS_API_KEY',
    deepinfra: 'DEEPINFRA_API_KEY',
    togetherai: 'TOGETHER_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    google: 'GOOGLE_API_KEY',
  };

  const activeProviders: ProviderName[] = [];

  for (const provider of providers) {
    const keyVar = keyMapping[provider];
    const keyVal = process.env[keyVar];
    const isConfigured = keyVal && keyVal.trim().length > 0 && !keyVal.includes('placeholder');
    
    if (isConfigured) {
      console.log(`  ${GREEN}✔${RESET} ${BOLD}${provider.toUpperCase()}${RESET}: Key detected (${keyVar})`);
      activeProviders.push(provider);
    } else {
      console.log(`  ${YELLOW}⚠${RESET} ${provider.toUpperCase()}: Key missing or empty (${keyVar})`);
    }
  }

  console.log(`\n${BOLD}2. LIVE CONNECTION & LATENCY BENCHMARKS${RESET}`);
  console.log('-------------------------------------');
  const tableData: Array<{
    provider: string;
    model: string;
    status: string;
    latency: string;
    error?: string;
  }> = [];

  for (const provider of providers) {
    const hasKey = activeProviders.includes(provider);
    const config = registry.getConfig(provider);
    
    if (!hasKey) {
      tableData.push({
        provider: provider.toUpperCase(),
        model: config.createModel().modelId,
        status: `${YELLOW}NO KEY${RESET}`,
        latency: 'N/A',
      });
      continue;
    }

    process.stdout.write(`  Testing ${BOLD}${provider.toUpperCase()}${RESET} (${config.createModel().modelId})... `);
    
    try {
      const model = registry.getModel(provider);
      const startTime = Date.now();
      
      // Make a cheap API call
      const res = await generateText({
        model,
        prompt: 'Hi, respond with only the word "OK"',
        maxTokens: 5,
      });

      const latency = Date.now() - startTime;
      const responseText = res.text.trim().replace(/\n/g, ' ');
      
      console.log(`${GREEN}Success${RESET} (${latency}ms) -> "${responseText}"`);
      
      tableData.push({
        provider: provider.toUpperCase(),
        model: config.createModel().modelId,
        status: `${GREEN}CONNECTED${RESET}`,
        latency: `${latency}ms`,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`${RED}Failed${RESET} -> ${errMsg.substring(0, 60)}...`);
      tableData.push({
        provider: provider.toUpperCase(),
        model: config.createModel().modelId,
        status: `${RED}ERROR${RESET}`,
        latency: 'FAIL',
        error: errMsg,
      });
    }
  }

  // Draw Summary Table
  console.log(`\n${BOLD}3. PROVIDER METRICS SUMMARY${RESET}`);
  console.log('--------------------------------------------------------------------------------------');
  console.log(
    `| ${BOLD}${'PROVIDER'.padEnd(12)}${RESET} | ${BOLD}${'MODEL'.padEnd(36)}${RESET} | ${BOLD}${'STATUS'.padEnd(18)}${RESET} | ${BOLD}${'LATENCY'.padEnd(10)}${RESET} |`
  );
  console.log('--------------------------------------------------------------------------------------');
  for (const row of tableData) {
    console.log(
      `| ${row.provider.padEnd(12)} | ${row.model.substring(0, 36).padEnd(36)} | ${row.status.padEnd(27)} | ${row.latency.padEnd(10)} |`
    );
  }
  console.log('--------------------------------------------------------------------------------------');

  // Print errors if any
  const errors = tableData.filter((r) => r.error);
  if (errors.length > 0) {
    console.log(`\n${RED}${BOLD}Failed Connections Breakdown:${RESET}`);
    for (const errRow of errors) {
      console.log(`  • ${BOLD}${errRow.provider}${RESET}: ${errRow.error}`);
    }
  }

  console.log(`\n${BOLD}4. END-TO-END WATERFALL CASCADING TEST${RESET}`);
  console.log('-------------------------------------');
  console.log('Running executeWaterfall with a medical cardiology prompt...');
  
  const testPrompt = 'Write a 1-sentence study tip for ECG interpretation.';
  const waterfallStart = Date.now();
  
  const result = await executeWaterfall(testPrompt, budgetManager, registry);
  const waterfallDuration = Date.now() - waterfallStart;

  if (result.success) {
    console.log(`\n  ${GREEN}🎉 Waterfall execution succeeded!${RESET}`);
    console.log(`  • ${BOLD}Provider Selected${RESET}: ${CYAN}${result.provider.toUpperCase()}${RESET} (Tier ${result.tier})`);
    console.log(`  • ${BOLD}Waterfall Latency${RESET}: ${GREEN}${result.latencyMs}ms${RESET} (Real clock time: ${waterfallDuration}ms)`);
    console.log(`  • ${BOLD}Generated Content${RESET}:\n`);
    console.log(`${CYAN}    "${result.text.trim()}"${RESET}\n`);
  } else {
    console.log(`\n  ${RED}❌ Waterfall execution failed!${RESET}`);
    console.log(`  • ${BOLD}Error${RESET}: ${result.error}`);
    console.log(`  • ${BOLD}Exhausted Tiers${RESET}: ${result.exhaustedProviders?.join(' -> ')}`);
  }

  console.log(`${WHITE_ON_BLUE} =================================================== ${RESET}\n`);
}

runDiagnostics().catch((err) => {
  console.error(`${RED}Diagnostic Execution Error:${RESET}`, err);
  process.exit(1);
});
