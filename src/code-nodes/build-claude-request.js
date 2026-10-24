// n8n Code node: "Build Claude request" (mode: Run Once for All Items)
// Fills the prompt templates (from prompts/ in the repository, embedded at build
// time by scripts/build-workflow.mjs) and builds an Anthropic Messages API body
// for each client.

const config = $('Config').first().json;

const SYSTEM_PROMPT = __SYSTEM_PROMPT__;
const USER_PROMPT_TEMPLATE = __USER_PROMPT_TEMPLATE__;
const OUTPUT_SCHEMA = __OUTPUT_SCHEMA__;

function fill(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.split(`{{${key}}}`).join(value),
    template,
  );
}

return $input.all().map((item) => {
  const c = item.json;
  const userPrompt = fill(USER_PROMPT_TEMPLATE, {
    CLIENT_NAME: c.clientName,
    PERIOD_START: c.periodStart,
    PERIOD_END: c.periodEnd,
    TICKET_STATS_JSON: JSON.stringify(c.stats, null, 2),
    TICKETS_JSON: JSON.stringify(c.tickets, null, 2),
    OUTPUT_SCHEMA_JSON: JSON.stringify(OUTPUT_SCHEMA, null, 2),
  });

  return {
    json: {
      companyId: c.companyId,
      clientName: c.clientName,
      requestBody: {
        model: config.claudeModel,
        max_tokens: Number(config.maxTokens) || 4000,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      },
    },
  };
});
