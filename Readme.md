# Test Portal iHub

The **Test Portal iHub** is an online testing platform designed to provide a seamless and secure environment for students to take tests. The platform enables camera and microphone integration to mimic real-life online test conditions. Administrators can create tests, manage topics, view student test reports, access student profiles, and utilize a dashboard for efficient management.

## Features
- Students can attend tests online with camera and microphone enabled.
- Admins can create tests, topics, and manage test settings.
- Detailed student test reports and profiles.
- Dashboard view for administrators to manage the system effectively.

## Project Structure
The project is divided into two main directories:
- **Frontend**: Built with React.js.
- **Backend**: Developed using Django.

## Prerequisites
Ensure you have the following installed on your system:
- Node.js (for the frontend)
- Python (for the backend)
- Git (for cloning the repository)

## Installation and Setup

### 1. Clone the Repository
To clone the repository, run:
```bash
git clone https://github.com/YourUsername/test-portal-ihub.git
```

Navigate to the project directory:
```bash
cd test-portal-ihub
```

### 2. Backend Setup
- Navigate to the `backend` directory:
  ```bash
  cd backend
  ```
- Create a virtual environment (optional but recommended):
  ```bash
  python -m venv venv
  source venv/bin/activate   # For Linux/Mac
  venv\Scripts\activate     # For Windows
  ```
- Install the required Python packages:
  ```bash
  pip install -r requirements.txt
  ```
- Apply database migrations:
  ```bash
  python manage.py migrate
  ```
- Start the Django development server:
  ```bash
  python manage.py runserver
  ```

The backend will now be running on [http://127.0.0.1:8000/](http://127.0.0.1:8000/).

### 3. Frontend Setup
- Open a new terminal and navigate to the `frontend` directory:
  ```bash
  cd frontend
  ```
- Install the required Node.js packages:
  ```bash
  npm install
  ```
- Start the React development server:
  ```bash
  npm start
  ```

The frontend will now be running on [http://localhost:3000/](http://localhost:3000/).

## Running the Project
To run the project:
1. Open two terminals.
2. In one terminal, navigate to the `backend` directory and start the Django server:
   ```bash
   python manage.py runserver
   ```
3. In the second terminal, navigate to the `frontend` directory and start the React server:
   ```bash
   npm start
   ```
4. Access the application in your browser at [http://localhost:3000/](http://localhost:3000/).

---
