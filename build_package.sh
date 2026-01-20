#!/bin/bash

# Define package name
VERSION="1.0.0"
PKG_NAME="simple_2fa_v$VERSION"
OUTPUT_DIR="dist"

# Create dist directory
mkdir -p $OUTPUT_DIR

# Clean previous build
rm -f $OUTPUT_DIR/$PKG_NAME.zip
rm -rf $OUTPUT_DIR/$PKG_NAME

# Create a temporary directory for packaging
mkdir -p $OUTPUT_DIR/$PKG_NAME

# Copy necessary files
cp -r backend $OUTPUT_DIR/$PKG_NAME/
cp -r frontend $OUTPUT_DIR/$PKG_NAME/
cp requirements.txt $OUTPUT_DIR/$PKG_NAME/
cp Dockerfile $OUTPUT_DIR/$PKG_NAME/
cp run.sh $OUTPUT_DIR/$PKG_NAME/
cp README.md $OUTPUT_DIR/$PKG_NAME/ 2>/dev/null || touch $OUTPUT_DIR/$PKG_NAME/README.md

# Zip the directory using Python
cd $OUTPUT_DIR
python3 -c "import shutil; shutil.make_archive('$PKG_NAME', 'zip', '$PKG_NAME')"
cd ..

# Cleanup temp dir
rm -rf $OUTPUT_DIR/$PKG_NAME

echo "Package created at $OUTPUT_DIR/$PKG_NAME.zip"
