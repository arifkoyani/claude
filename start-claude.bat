@echo off
set ANTHROPIC_BASE_URL=http://localhost:3000/api
set ANTHROPIC_API_KEY=session-bridge-token
claude --bare %*
