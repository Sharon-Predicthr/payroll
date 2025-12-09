# Design Request Template
## Quick Fill-in Form for New Screens

**Copy this template and fill it out for your request**

---

## 📋 Basic Information

**Screen Name:** [e.g., Employee Management, Settings, Reports Dashboard]

**Priority:** [ ] High [ ] Medium [ ] Low

**Timeline:** [ ] Urgent [ ] This Sprint [ ] Next Sprint [ ] Flexible

**Requested By:** [Your Name]

**Date:** [Date]

---

## 🎯 Purpose & Goals

**What problem does this screen solve?**
[Describe the business need or user problem]

**Who will use this screen?**
[ ] HR Managers [ ] Payroll Administrators [ ] Employees [ ] Other: _________

**What's the main goal?**
[ ] View data [ ] Add/Edit data [ ] Process workflow [ ] Generate reports [ ] Other: _________

---

## ✨ Key Features

**What functionality is needed?** (Check all that apply)

**Data Display:**
- [ ] Data table/list
- [ ] Cards/grid view
- [ ] Charts/graphs
- [ ] Summary statistics
- [ ] Details view

**Actions:**
- [ ] Add new record
- [ ] Edit existing record
- [ ] Delete record
- [ ] Bulk actions
- [ ] Export data
- [ ] Print/PDF
- [ ] Approve/Reject workflow

**Filters & Search:**
- [ ] Search bar
- [ ] Filter dropdowns
- [ ] Date range picker
- [ ] Advanced filters
- [ ] Sortable columns

**Forms:**
- [ ] Simple form (1-5 fields)
- [ ] Complex form (6-15 fields)
- [ ] Multi-step form
- [ ] Modal form
- [ ] Full-page form

---

## 📊 Data Requirements

**What data should be displayed?**

**Data Source:** [API endpoint or database table name]

**Fields to Show:**
[List the fields/columns needed]

**Example:**
- Employee ID
- Full Name
- Email
- Department
- Status
- Hire Date

**Filters Needed:**
[What can users filter by?]

**Sorting:**
[What can be sorted? Default sort?]

**Pagination:**
[ ] Yes, expected [number] records
[ ] No, small dataset

---

## 🎨 Layout & Design

**Layout Style:**
[ ] Full page (no sidebar)
[ ] With sidebar navigation
[ ] Dashboard style (multiple sections)
[ ] Modal/Dialog
[ ] Wizard/Multi-step

**Visual Reference:**
[ ] I have a mockup/screenshot (attached)
[ ] Similar to existing screen: [Which screen?]
[ ] Similar to external app: [App name/screenshot]
[ ] No reference, create new design

**Design Style:**
[ ] Match existing payroll dashboard
[ ] Match login screen style
[ ] New style (describe: _____________)

---

## 📱 Technical Requirements

**Responsive Design:**
[ ] Desktop only
[ ] Desktop + Tablet
[ ] Desktop + Tablet + Mobile
[ ] Mobile-first

**RTL Support:**
[ ] Required (Hebrew/Arabic)
[ ] Not needed
[ ] Optional

**Performance:**
[ ] Small dataset (< 100 records)
[ ] Medium dataset (100-1000 records)
[ ] Large dataset (1000+ records)
[ ] Real-time updates needed

**Browser Support:**
[ ] Modern browsers only
[ ] Include IE11
[ ] Specific browsers: _____________

---

## 🔄 User Flow

**Describe how users will interact with this screen:**

**Step 1:** [What happens first?]
**Step 2:** [What happens next?]
**Step 3:** [Continue...]

**Example:**
1. User lands on employee list page
2. User clicks "Add Employee" button
3. Modal opens with form
4. User fills in employee details
5. User clicks "Save"
6. Form validates and saves
7. Success message appears
8. Modal closes, list refreshes

---

## ✅ Validation & Rules

**Form Validation:**
[List any validation rules]

**Example:**
- Email must be valid format
- Phone number: 10 digits
- Required fields: Name, Email, Department
- Hire date cannot be in future

**Business Rules:**
[Any business logic constraints]

**Example:**
- Cannot delete employee with active payroll
- Status change requires approval
- Department must exist

---

## 🎯 Success Criteria

**How will we know this screen is successful?**

[ ] Users can complete [specific task] in [time]
[ ] Reduces [specific problem] by [percentage]
[ ] Improves [specific metric]
[ ] User feedback: [specific goal]

---

## 📎 Attachments

**Please attach:**
- [ ] Mockup/Screenshot
- [ ] Wireframe
- [ ] Reference images
- [ ] Sample data
- [ ] Related documents

**File names:** [List attached files]

---

## 💬 Additional Notes

**Any other information that might be helpful:**

[Free text area for additional context, edge cases, special requirements, etc.]

---

## 📞 Questions?

**If you're unsure about any section, just write "TBD" and we'll discuss during review.**

---

**Submit this completed form to the development team along with any attachments.**

