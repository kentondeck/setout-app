#!/bin/bash
git checkout main
git merge Nick
git push origin main
git checkout Nick
echo "Done — pushed to main and back on Nick branch."
