# Design Requirements Guide
## How to Request New Screens and Design Updates

**Version:** 1.0  
**Last Updated:** December 2025  
**Purpose:** This guide helps stakeholders communicate design and functionality requirements effectively to the development team.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Best Practices](#best-practices)
3. [Request Templates](#request-templates)
4. [Visual Communication Methods](#visual-communication-methods)
5. [Detailed Specifications](#detailed-specifications)
6. [What Information We Need](#what-information-we-need)
7. [Examples](#examples)
8. [FAQ](#faq)

---

## 🚀 Quick Start

**The fastest way to request a new screen:**

1. **Describe the goal** - What should this screen do?
2. **List key features** - What functionality is needed?
3. **Share a visual** - Screenshot, mockup, or sketch (even rough is fine!)
4. **Mention constraints** - Mobile? RTL? Performance requirements?

**Example:**
> "I need an employee management screen that shows a list of employees, allows search/filter by department, and can add/edit employees. Similar to the payroll dashboard style. Must work on mobile."

---

## ✨ Best Practices

### Do's ✅

- **Start with the goal** - What problem are we solving?
- **Use examples** - "Like the payroll dashboard but for employees"
- **Be specific** - "Table with 5 columns" vs "show employees"
- **Share visuals** - Even rough sketches help tremendously
- **Mention user flow** - "User clicks button → modal opens → fills form → saves"
- **Include data needs** - What data should be displayed?
- **Specify priorities** - What's must-have vs nice-to-have?

### Don'ts ❌

- Don't assume technical knowledge - explain in business terms
- Don't skip the "why" - Understanding purpose helps design better solutions
- Don't forget edge cases - "What if there are 1000 employees?"
- Don't ignore mobile - Always mention if mobile is important

---

## 📝 Request Templates

### Template 1: Simple Screen Request

```
Screen Name: [e.g., Employee Management]
Purpose: [What problem does this solve?]

Key Features:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Visual Reference: [Screenshot/Mockup/Sketch]
Similar to: [Existing screen or external example]

Requirements:
- [ ] Mobile responsive
- [ ] RTL support
- [ ] Real-time updates
- [ ] Export functionality
```

### Template 2: Detailed Screen Request

```
SCREEN REQUEST: [Screen Name]

1. OVERVIEW
   Purpose: [Business goal]
   Target Users: [Who will use this?]
   Priority: [High/Medium/Low]

2. FUNCTIONALITY
   Primary Actions:
   - [Action 1]
   - [Action 2]
   
   Data Display:
   - [What data to show]
   - [Where data comes from]
   
   User Flow:
   1. User [action]
   2. System [response]
   3. User [next action]

3. LAYOUT
   - Header: [What goes here?]
   - Sidebar: [Yes/No, what content?]
   - Main Content: [Description]
   - Footer: [What goes here?]

4. COMPONENTS NEEDED
   - [ ] Data table
   - [ ] Search bar
   - [ ] Filter dropdowns
   - [ ] Modal forms
   - [ ] Buttons/Actions
   - [ ] Charts/Graphs

5. DATA REQUIREMENTS
   Source: [API endpoint / Database table]
   Fields: [List of fields to display]
   Filters: [What can be filtered?]
   Sorting: [What can be sorted?]

6. VALIDATION RULES
   - [Field] must be [requirement]
   - [Field] format: [example]

7. CONSTRAINTS
   - Performance: [e.g., Must load 1000+ records]
   - Browser: [Specific browsers?]
   - Mobile: [Yes/No]
   - RTL: [Yes/No]

8. VISUAL REFERENCES
   - [Attach screenshots/mockups]
   - Similar to: [Existing screen]
   - Design style: [Material/Bootstrap/Custom]
```

### Template 3: Design Update Request

```
DESIGN UPDATE REQUEST

Screen: [Which screen?]
Current Issue: [What's wrong?]
Desired Change: [What should it look like?]

Specific Changes:
- [Element 1]: [Current] → [Desired]
- [Element 2]: [Current] → [Desired]

Visual Reference: [Before/After mockup]
Reason: [Why this change?]
```

---

## 🎨 Visual Communication Methods

### Method 1: Screenshots & Mockups
**Best for:** Exact look and feel

- **Figma/Adobe XD/Sketch files** - Professional mockups
- **Screenshots** - From similar applications
- **Annotated images** - Marked up with notes
- **Before/After comparisons** - Show current vs desired

**How to share:**
- Attach files to request
- Use image hosting (Imgur, Google Drive)
- Include in email/document

### Method 2: Wireframes & Sketches
**Best for:** Layout and structure

- **Hand-drawn sketches** - Even rough is helpful!
- **Digital wireframes** - Draw.io, Miro, Whimsical
- **Low-fidelity mockups** - Basic shapes and layout

**What to include:**
- Layout structure
- Component placement
- Navigation flow
- Key interactions

### Method 3: Interactive Prototypes
**Best for:** Complex user flows

- **Figma prototypes** - Clickable mockups
- **InVision/Marvel** - Interactive demos
- **Video walkthrough** - Screen recording

### Method 4: Reference Examples
**Best for:** Style and inspiration

- **Similar applications** - "Like this but..."
- **Design system examples** - Material Design, Ant Design
- **Competitor screenshots** - What works well elsewhere

---

## 📊 Detailed Specifications

### Layout Structure

When describing layout, include:

```
┌─────────────────────────────────────┐
│ Header (Logo, User Menu, Notifications) │
├──────────┬──────────────────────────┤
│          │                           │
│ Sidebar  │   Main Content Area      │
│ (Nav)    │   - Tables               │
│          │   - Forms                │
│          │   - Cards                 │
│          │                           │
└──────────┴───────────────────────────┘
```

**Specify:**
- Fixed or collapsible sidebar?
- Header height and content
- Content area width constraints
- Footer needed?

### Component Specifications

For each component, specify:

**Tables:**
- Columns and their widths
- Sortable columns
- Filterable columns
- Row actions (edit, delete, etc.)
- Pagination style
- Row selection (single/multiple)

**Forms:**
- Field labels and types
- Required vs optional fields
- Validation rules
- Field grouping/sections
- Submit button placement
- Cancel/Reset actions

**Modals/Dialogs:**
- Size (small/medium/large/fullscreen)
- Close behavior (X button, outside click, ESC)
- Footer actions (Save, Cancel, etc.)
- Scrollable content?

**Buttons:**
- Primary vs secondary
- Icon placement
- Loading states
- Disabled states

### Data Requirements

Specify:

```
Data Source: /api/employees
Data Format: JSON
Fields to Display:
  - id (hidden, for actions)
  - name (sortable, searchable)
  - email (sortable, searchable)
  - department (filterable)
  - status (badge display)
  - hire_date (formatted as "MM/DD/YYYY")

Filters:
  - Department (dropdown)
  - Status (toggle buttons)
  - Date range (date picker)

Sorting:
  - Default: name (ascending)
  - Allowed: name, email, hire_date
```

---

## 📋 What Information We Need

### Must Have (Critical)
- [ ] **Screen purpose** - What problem does it solve?
- [ ] **Key functionality** - What can users do?
- [ ] **Data to display** - What information is shown?
- [ ] **User flow** - How do users interact with it?

### Should Have (Important)
- [ ] **Visual reference** - Screenshot, mockup, or sketch
- [ ] **Layout structure** - Header, sidebar, content areas
- [ ] **Component list** - Tables, forms, buttons, etc.
- [ ] **Data source** - Where does data come from?

### Nice to Have (Helpful)
- [ ] **Detailed wireframes** - Exact layout
- [ ] **Color scheme** - If different from current
- [ ] **Typography preferences** - Font sizes, weights
- [ ] **Animation preferences** - Transitions, loading states
- [ ] **Accessibility requirements** - Screen readers, keyboard nav

---

## 💡 Examples

### Example 1: Simple Request

**Request:**
> "I need a settings page where users can update their company information. Should have a form with company name, address, phone, email fields, and a save button. Similar style to the payroll dashboard."

**What we'll deliver:**
- Settings page with form
- Validation for required fields
- Save functionality
- Success/error messages
- Consistent styling with existing pages

### Example 2: Medium Complexity

**Request:**
> "Employee List Screen:
> - Table showing: Name, Email, Department, Status, Actions
> - Search bar at top to filter by name/email
> - Filter dropdown for departments
> - 'Add Employee' button that opens a modal form
> - Edit/Delete actions in each row
> - Pagination for large lists
> - Must work on mobile
> - RTL support needed
> 
> Form fields: First Name, Last Name, Email, Department (dropdown), Hire Date, Status (active/inactive)
> 
> Reference: [Screenshot of similar design]"

**What we'll deliver:**
- Full employee management interface
- Responsive table with search and filters
- Modal form for add/edit
- Mobile-optimized layout
- RTL support
- API integration ready

### Example 3: Complex Request

**Request:**
> "Payroll Processing Dashboard:
> 
> **Overview:**
> Multi-step payroll processing workflow for HR managers to review and approve payroll runs.
> 
> **Layout:**
> - Top: Progress indicator (Step 1 of 4)
> - Left: Sidebar with payroll run summary
> - Center: Main content area (changes per step)
> - Bottom: Navigation buttons (Back, Next, Save Draft)
> 
> **Steps:**
> 1. Select Period - Calendar picker, shows existing periods
> 2. Review Employees - Table with checkboxes, can exclude employees
> 3. Review Calculations - Summary cards + detailed breakdown
> 4. Approve & Submit - Final review, approval checkbox, submit button
> 
> **Data:**
> - Source: /api/payroll/runs
> - Real-time calculation updates
> - Save draft functionality
> 
> **Requirements:**
> - Must handle 500+ employees
> - Real-time calculation (show loading states)
> - Undo/Redo for exclusions
> - Export summary to PDF
> - Mobile: Simplified flow
> 
> **Visual:** [Figma mockup attached]"

**What we'll deliver:**
- Complete multi-step workflow
- Progress tracking
- Real-time calculations
- Draft saving
- PDF export
- Mobile-responsive
- Performance optimized

---

## ❓ FAQ

### Q: How detailed should my request be?
**A:** Start with the basics (purpose, key features, visual reference). We can ask clarifying questions. More detail = faster delivery, but don't let perfectionism delay getting started.

### Q: What if I don't have a mockup?
**A:** No problem! Describe it in text, share similar examples, or even rough sketches. We can create mockups during development.

### Q: Can I request changes after development starts?
**A:** Yes, but changes are easier and faster if requirements are clear upfront. Major changes may require additional time.

### Q: How long does it take to create a new screen?
**A:** Depends on complexity:
- Simple screen (list + form): 2-4 hours
- Medium screen (multiple components): 1-2 days
- Complex screen (workflows, integrations): 3-5 days

### Q: Do you need access to design tools?
**A:** Not required. Screenshots, PDFs, or even photos of sketches work perfectly.

### Q: What about existing design patterns?
**A:** We'll follow your existing design system (like the payroll dashboard) unless you specify otherwise.

### Q: Can you create mobile versions?
**A:** Yes! We can create responsive designs that work on all devices. Just mention mobile requirements.

### Q: What about RTL (Right-to-Left) support?
**A:** We can add RTL support for Hebrew/Arabic interfaces. Mention this in your request.

---

## 🎯 Quick Checklist

Before submitting a request, check:

- [ ] Clear purpose/goal described
- [ ] Key features listed
- [ ] Visual reference provided (even rough)
- [ ] Data requirements specified
- [ ] User flow described
- [ ] Constraints mentioned (mobile, RTL, performance)
- [ ] Priority indicated (if applicable)

---

## 📞 Next Steps

1. **Fill out a template** (use Template 1 for simple, Template 2 for complex)
2. **Attach visuals** (screenshots, mockups, sketches)
3. **Submit to development team**
4. **Review initial mockup** (we'll create one if you don't have it)
5. **Provide feedback** (iterations are expected!)
6. **Approve and deploy**

---

## 📚 Additional Resources

- **Design System:** Reference existing screens (payroll dashboard, login)
- **Component Library:** We use Tailwind CSS + custom components
- **API Documentation:** Available for data integration
- **Style Guide:** Follows modern, clean design principles

---

## ✍️ Document Your Request

**Use this format when submitting:**

```
Subject: [Screen Name] - Design Request

Priority: [High/Medium/Low]
Timeline: [Urgent/This Sprint/Next Sprint]

[Paste your request using one of the templates above]

Attachments:
- [Mockup/Screenshot files]
- [Reference materials]
```

---

**Remember:** The goal is clear communication. Don't worry about being too technical - describe what you need in business terms, and we'll handle the technical implementation!

---

*This document is a living guide. Please provide feedback to improve it.*

