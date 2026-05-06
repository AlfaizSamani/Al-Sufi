import re

with open('database.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# The exact markers
start_marker = '-- ── USER ROLES '
end_marker = '-- ── ADDRESSES '
cat_marker = '-- ── CATEGORIES '

# Find the block
roles_start = content.find(start_marker)
roles_end = content.find(end_marker)

if roles_start != -1 and roles_end != -1:
    roles_block = content[roles_start:roles_end]
    
    # Remove it from current location
    content_without_roles = content.replace(roles_block, '')
    
    # Insert it before CATEGORIES
    new_content = content_without_roles.replace(cat_marker, roles_block + '\n' + cat_marker)
    
    with open('database.sql', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully reordered database.sql")
else:
    print("Could not find markers")
