export const SAMPLE_DBML = `// Paste your DBML here. Edit the text and the diagram updates live.
// Docs: https://dbml.dbdiagram.io/docs

Table users {
  id integer [pk, increment]
  username varchar [not null, unique]
  email varchar [not null, unique]
  role_id integer [ref: > roles.id]
  created_at timestamp
  Note: 'Application users'
}

Table roles {
  id integer [pk]
  name varchar [not null]
  description text
}

Table posts {
  id integer [pk, increment]
  title varchar [not null]
  body text
  author_id integer [ref: > users.id, not null]
  status post_status
  created_at timestamp
}

Table comments {
  id integer [pk, increment]
  post_id integer [ref: > posts.id]
  author_id integer [ref: > users.id]
  body text
  created_at timestamp
}

Table tags {
  id integer [pk]
  name varchar [unique, not null]
}

Table post_tags {
  post_id integer [ref: > posts.id]
  tag_id integer [ref: > tags.id]
  indexes {
    (post_id, tag_id) [pk]
  }
}

Enum post_status {
  draft
  published
  archived
}

TableGroup access {
  users
  roles
}

TableGroup content {
  posts
  comments
  tags
  post_tags
}
`;
