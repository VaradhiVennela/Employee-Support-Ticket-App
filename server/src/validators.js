const { CATEGORIES, PRIORITIES, STATUSES } = require('./constants');

function requiredText(value, label, maxLength) {
  if (typeof value !== 'string' || value.trim() === '') {
    return `${label} is required.`;
  }
  const trimmed = value.trim();
  if (maxLength && trimmed.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer.`;
  }
  return null;
}

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) {
    return `${label} must be one of ${allowed.join(', ')}.`;
  }
  return null;
}

function validateTicketContent(body) {
  const titleError = requiredText(body.title, 'Title', 100);
  if (titleError) return titleError;
  const descriptionError = requiredText(body.description, 'Description');
  if (descriptionError) return descriptionError;
  const categoryError = oneOf(body.category, CATEGORIES, 'Category');
  if (categoryError) return categoryError;
  const priorityError = oneOf(body.priority, PRIORITIES, 'Priority');
  if (priorityError) return priorityError;
  return null;
}

function validateStatus(status) {
  return oneOf(status, STATUSES, 'Status');
}

function validateComment(body) {
  return requiredText(body, 'Comment');
}

function parseTicketId(raw) {
  if (!/^-?\d+$/.test(String(raw))) {
    return { error: 'Ticket id must be a number.', status: 400 };
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) {
    return { error: 'Ticket not found.', status: 404 };
  }
  return { id };
}

module.exports = {
  validateTicketContent,
  validateStatus,
  validateComment,
  parseTicketId,
};
