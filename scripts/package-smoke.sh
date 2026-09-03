#!/usr/bin/env bash
set -euo pipefail

release_dir="$(mktemp -d)"
trap 'rm -rf "$release_dir"' EXIT

npm run build
package_file="$(npm pack --pack-destination "$release_dir" --json | node -e 'let input="";process.stdin.on("data",chunk=>input+=chunk).on("end",()=>process.stdout.write(JSON.parse(input)[0].filename))')"
mkdir "$release_dir/consumer"
cd "$release_dir/consumer"
npm init -y >/dev/null
npm install --ignore-scripts "$release_dir/$package_file" >/dev/null
node --input-type=module -e "import { HeadlessCommerceClient, verifyWebhook } from '@phessage/headless-commerce-sdk'; if (typeof HeadlessCommerceClient !== 'function' || typeof verifyWebhook !== 'function') process.exit(1)"
printf 'Package install smoke passed: %s\n' "$package_file"
