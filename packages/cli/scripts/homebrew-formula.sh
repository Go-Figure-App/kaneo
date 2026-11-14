#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <version> <SHA256SUMS file>" >&2
  exit 1
fi

version=$1
sums=$2
base="https://github.com/Go-Figure-App/tracing/releases/download/cli-v$version"

sha() {
  value=$(awk -v name="$1" '$2 == name || $2 == "*" name { print tolower($1); exit }' "$sums")
  case $value in
    "" | *[!0-9a-f]*)
      echo "No valid checksum for $1 in $sums" >&2
      exit 1
      ;;
  esac
  if [ "${#value}" -ne 64 ]; then
    echo "The checksum for $1 in $sums is not a SHA-256 digest" >&2
    exit 1
  fi
  printf '%s' "$value"
}

darwin_arm64=$(sha tracing-darwin-arm64)
darwin_x64=$(sha tracing-darwin-x64)
linux_arm64=$(sha tracing-linux-arm64)
linux_x64=$(sha tracing-linux-x64)

cat <<EOF
class Tracing < Formula
  desc "Official command-line client for Tracing, the open source project manager"
  homepage "https://tracing.gofigureapp.io/docs/cli"
  version "$version"
  license "MIT"

  on_macos do
    on_arm do
      url "$base/tracing-darwin-arm64"
      sha256 "$darwin_arm64"
    end
    on_intel do
      url "$base/tracing-darwin-x64"
      sha256 "$darwin_x64"
    end
  end

  on_linux do
    on_arm do
      url "$base/tracing-linux-arm64"
      sha256 "$linux_arm64"
    end
    on_intel do
      url "$base/tracing-linux-x64"
      sha256 "$linux_x64"
    end
  end

  def install
    bin.install Dir["tracing-*"].first => "tracing"
  end

  test do
    assert_match "\\"version\\":\\"#{version}\\"", shell_output("#{bin}/tracing --version --json")
  end
end
EOF
