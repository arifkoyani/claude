$env:ANTHROPIC_BASE_URL = "http://localhost:3000/api"
$env:ANTHROPIC_API_KEY = "session-bridge-token"
claude --bare @args
