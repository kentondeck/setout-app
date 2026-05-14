#!/bin/sh
# Run once after cloning: sh scripts/install-hooks.sh
cat > .git/hooks/pre-push << 'EOF'
#!/bin/sh
echo "Type-checking before push..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo ""
  echo "Push blocked — fix TypeScript errors above first."
  exit 1
fi
echo "Type-check passed."
EOF
chmod +x .git/hooks/pre-push
echo "Pre-push hook installed."
