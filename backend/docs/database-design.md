# MediCard — Database Design

Database name: **medicard**

ORM: Mongoose (MongoDB)

---

## Planned Collections

### users

Stores authentication credentials and role information. Each user has exactly one role (`patient`, `doctor`, `pharmacist`, `diagnostic_center`, `admin`). This is the central authentication record — all other entities reference a user.

### patients

Stores patient-specific profile information linked to a user account. Contains personal details (name, date of birth, gender, contact info, address).

### doctors

Stores doctor profile and professional information linked to a user account. Contains specialization, license number, qualifications, hospital/clinic affiliation, and availability status.

### pharmacies

Stores pharmacy business profile information linked to a user account. Contains pharmacy name, license number, address, and contact details.

### diagnosticCenters

Stores diagnostic center business profile information linked to a user account. Contains center name, license number, address, and offered test categories.

### medicalRecords

Stores individual medical events, consultations, and clinical notes created by authorized doctors for a patient. Each record is an immutable clinical event tied to a patient and an attending doctor.

**Append-only rule:** Medical records must never be edited or deleted after creation. Corrections must be recorded as new records with a reference to the original. This rule is a core project requirement and must be preserved in all future implementation.

### prescriptions

Stores prescriptions created by authorized doctors. Each prescription is linked to a specific medical record, a patient, and an issuing doctor. Contains medication details, dosage instructions, and issuance timestamp.

### medicines

Stores the medicine catalog. Contains medicine name, manufacturer, generic name, category, available forms, and pricing information.

### medicinePurchases

Stores purchase/transaction records when a patient buys medicines from a linked pharmacy. Contains purchase items, total amount, status (pending, confirmed, delivered), and timestamps.

### appointments

Stores appointment bookings between a patient and a doctor. Contains appointment date/time, status (scheduled, completed, cancelled), reason, and link to the attending doctor and patient.

### labTests

Stores the catalog of available lab/diagnostic tests. Contains test name, category, price, normal range values, and associated diagnostic center.

### labReports

Stores diagnostic reports issued by authorized diagnostic centers after completing lab tests. Contains test results, reference ranges, report status, and timestamps.

### chats

Stores conversation/chat sessions between two or more participants (e.g., patient and doctor).

### messages

Stores individual messages within a chat session. Contains sender, message content, timestamp, and read/unread status.

### deliveries

Stores medicine delivery tracking information for confirmed medicine purchases. Contains delivery status, assigned rider, delivery address, and estimated delivery time.

### auditLogs

Stores important access and system activity records for security and compliance. Contains action type, actor (user), target resource, timestamp, and IP address. Audit logs are append-only.

### notifications

Stores user notifications (appointment reminders, prescription updates, delivery status changes, etc.). Contains notification type, message, read/unread status, and timestamps.

---

## Design Principles

1. **Append-only medical records:** Medical and audit records must never be modified or deleted after creation. All corrections are new records with references to the original.
2. **Separation of concerns:** Authentication data (users) is separated from profile data (patients, doctors, pharmacies, diagnostic centers).
3. **Referential integrity:** Entities reference users, patients, doctors, etc. by their `_id` (MongoDB ObjectId).
4. **Least privilege:** No single collection stores both credentials and profile data.
5. **Auditability:** All significant actions are logged to the auditLogs collection.