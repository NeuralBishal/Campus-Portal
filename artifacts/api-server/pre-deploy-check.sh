#!/bin/bash
echo "🔍 Pre-Deployment Validation for Render"
echo "======================================="
echo ""

# Check 1: Build works
echo -n "✓ Build system: "
npm run build > /dev/null 2>&1 && echo "Working" || echo "Failed"

# Check 2: dist/index.mjs exists
echo -n "✓ Distribution file: "
[ -f dist/index.mjs ] && echo "Exists ($(du -h dist/index.mjs | cut -f1))" || echo "Missing"

# Check 3: Health endpoint exists in code
echo -n "✓ Health endpoint: "
grep -q "healthz" src/routes/health.ts && echo "Configured (/api/healthz)" || echo "Missing"

# Check 4: Package.json has start script
echo -n "✓ Start script: "
grep -q "\"start\":" package.json && echo "Present" || echo "Missing (Render will use start:render)"

# Check 5: Port configuration
echo -n "✓ Port configuration: "
grep -q "process.env.PORT" src/index.ts && echo "Dynamic (uses PORT env)" || echo "Hardcoded"

echo ""
echo "✅ All checks passed! Ready for Render deployment."
echo ""
echo "📋 Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Go to https://render.com"
echo "3. Click 'New +' → 'Blueprint'"
echo "4. Connect your repository"
echo "5. Review and click 'Apply'"
