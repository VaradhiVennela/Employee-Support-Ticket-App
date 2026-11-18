# Product Prompt

**Product:** Employee Support Ticket Management Application

**Author:** Vennela Varadhi

**Assignment:** Day 4 practical

## Problem

Employees need a simple application to report workplace IT problems and track their resolution. Support staff need a central place to manage and resolve employee requests.

## Users

### Employee

- Submit support tickets.
- View only their own tickets.
- Check ticket status.
- Update their requests.
- Add comments to tickets.

### Support Staff

- View all employee tickets.
- Update ticket status.
- Add comments.
- Track and manage support requests.

## Main features

- User authentication and role-based access.
- Ticket creation.
- Ticket listing and search.
- Ticket status tracking.
- Ticket editing.
- Ticket comments.
- Support staff dashboard.
- Employee dashboard.

## Project limits

- Keep the application small and suitable for a practical demonstration.
- Do not implement unnecessary enterprise features. There is no registration portal, password reset, email, file upload, SLA tracking, or pagination.
- Use fictional sample data.
- Do not use real employee information, passwords, or client data.

## Confirmed decisions

These two points were confirmed before implementation:

- Support staff can change the status of a Closed ticket, including back to Open, In Progress, or Resolved. Title, description, category, and priority stay locked once the ticket is Closed.
- While a ticket is not Closed, both the employee who created it and any support staff member may edit title, description, category, and priority. Only support staff may change status.
