#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// ID mappings from old organization to new organization
const ID_MAPPINGS = {
  organizations: {
    k57adbwt1jy2t9yp0kc0nc56vd7j2kr0: 'kd717wy14v03szcf28w18s976s7kt2gw',
  },
  projects: {
    kh72zvb6xajs2cfgq5kay20v0h7j24pb: 'ks7ezf7nfa1fmjyh9wp8277b397kthr6',
  },
  users: {
    kn7et0vnqk8hsx57mr0psg1m6n7j2g1v: 'kx781fy13hzs071zs20gprjpsh7kvnw4',
  },
};

function transformId(value, fieldName) {
  if (typeof value !== 'string') return value;

  // Check if it's an organizationId
  if (fieldName.includes('organizationId') && ID_MAPPINGS.organizations[value]) {
    return ID_MAPPINGS.organizations[value];
  }

  // Check if it's a projectId
  if (fieldName.includes('projectId') && ID_MAPPINGS.projects[value]) {
    return ID_MAPPINGS.projects[value];
  }

  // Check if it's a userId
  if (
    (fieldName.includes('userId') ||
      fieldName.includes('createdBy') ||
      fieldName.includes('lastModifiedBy')) &&
    ID_MAPPINGS.users[value]
  ) {
    return ID_MAPPINGS.users[value];
  }

  return value;
}

function transformObject(obj, path = '', removeIds = false) {
  if (Array.isArray(obj)) {
    return obj.map((item, index) => transformObject(item, `${path}[${index}]`, removeIds));
  }

  if (obj && typeof obj === 'object') {
    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip _id and _creationTime fields if removeIds is true
      if (removeIds && (key === '_id' || key === '_creationTime')) {
        continue;
      }
      const currentPath = path ? `${path}.${key}` : key;
      transformed[key] = transformObject(transformId(value, key), currentPath, removeIds);
    }
    return transformed;
  }

  return obj;
}

function transformJsonlFile(inputPath, outputPath) {
  const lines = fs
    .readFileSync(inputPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim());
  const tableName = path.basename(path.dirname(inputPath));

  // Remove IDs for tables that might have conflicts
  const removeIds = ['categoryLevelDefinitions', 'organizationMemberships'].includes(tableName);

  const transformedLines = lines.map((line) => {
    try {
      const doc = JSON.parse(line);
      const transformed = transformObject(doc, '', removeIds);
      return JSON.stringify(transformed);
    } catch (e) {
      console.error(`Error parsing line: ${e.message}`);
      return line;
    }
  });

  fs.writeFileSync(outputPath, transformedLines.join('\n'));
  console.log(
    `✓ Transformed ${lines.length} documents in ${path.basename(inputPath)}${removeIds ? ' (IDs removed)' : ''}`
  );
}

function main() {
  const sourceDir = './filtered_snapshot_for_import';
  const targetDir = './transformed_import';

  // Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy structure and transform data
  const tables = fs
    .readdirSync(sourceDir)
    .filter((name) => fs.statSync(path.join(sourceDir, name)).isDirectory());

  for (const table of tables) {
    const tableSourceDir = path.join(sourceDir, table);
    const tableTargetDir = path.join(targetDir, table);

    // Create table directory
    fs.mkdirSync(tableTargetDir, { recursive: true });

    // Check if documents.jsonl exists
    const docsPath = path.join(tableSourceDir, 'documents.jsonl');
    if (fs.existsSync(docsPath)) {
      transformJsonlFile(docsPath, path.join(tableTargetDir, 'documents.jsonl'));
    }

    // Copy schema file if exists
    const schemaPath = path.join(tableSourceDir, 'generated_schema.jsonl');
    if (fs.existsSync(schemaPath)) {
      fs.copyFileSync(schemaPath, path.join(tableTargetDir, 'generated_schema.jsonl'));
    }
  }

  // Copy README
  const readmePath = path.join(sourceDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    fs.copyFileSync(readmePath, path.join(targetDir, 'README.md'));
  }

  console.log('\n✅ Transformation complete! Files saved to:', targetDir);
}

main();
