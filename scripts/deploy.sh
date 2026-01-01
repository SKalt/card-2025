#!/bin/bash
# prep work: created a git worktree in ./build, added a dummy commit, pushed it
# to origin
set -euo pipefail
rm -f /tmp/.git
if [ -f build/.git ]; then cp build/.git /tmp/.git; fi
pnpm build # <- this nukes the .git
if [ -f /tmp/.git ]; then cp /tmp/.git ./build/; fi
cd ./build
git add .
git commit -m "chore: deploy" 
git push
