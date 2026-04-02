# PoolDesk AI Ride Recommendation - Integration Guide

This guide explains how to set up and use the AI-powered ride matching system for PoolDesk.

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  (React/Vite)   │
└────────┬────────┘
         │ POST /api/rides/find
         ▼
┌─────────────────────────────┐
│   Node.js Backend           │
│  (Express Server)           │
│  - Auth endpoints           │
│  - Proxy to ML service      │
└────────┬────────────────────┘
         │ POST /recommend
         ▼
┌──────────────────────────────┐
│  Python ML Service           │
│  (FastAPI)                   │
│  - KMeans clustering         │
│  - Logistic regression       │
│  - Ride matching logic       │
└──────────────────────────────┘
```

## Step 1: Prepare Your ML Models

### Add Model Files
Copy the following pickle files to `server/ml/`:
- `pickup_kmeans_model.pkl`
- `hybrid_logistic_model.pkl`

### Add Dataset Files (Optional)
For advanced matching, copy CSV files to `server/ml/`:
- `final_rides.csv`
- `final_users.csv`
- `final_ride_requests.csv`

Files should have these columns:
- `pickup_distance` (float): Distance in km
- `drop_distance` (float): Distance in km
- `time_difference` (float): Time in minutes
- `available_seats` (int): Number of seats
- `gender_match` (0 or 1): Gender preference match

## Step 2: Install Python Dependencies

```bash
cd server/ml
pip install -r requirements.txt
```

### Required packages:
- fastapi==0.104.1
- uvicorn==0.24.0
- numpy==1.24.3
- pandas==2.0.3
- scikit-learn==1.3.1

## Step 3: Configure Environment

The `.env` file already includes:
```
MONGODB_URI=<your_mongodb_url>
ML_SERVICE_URL=http://localhost:8000
```

If running the ML service on a different host/port, update `ML_SERVICE_URL`.

## Step 4: Start the Services

### Terminal 1: Start Node.js Backend
```bash
npm run dev
```
This starts the Express server on http://localhost:5173 (or configured port)

### Terminal 2: Start Python ML Service
```bash
cd server/ml
python -m uvicorn app:app --reload --port 8000
```
This starts the FastAPI server on http://localhost:8000

## Step 5: Test the Integration

### Health Check
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "kmeans_loaded": true,
  "logistic_loaded": true,
  "rides_data_loaded": false  // false if CSV not provided
}
```

### Test Ride Search via Frontend
1. Navigate to the Dashboard
2. Click "Find a Ride" tab
3. Fill in search criteria:
   - Pickup Location
   - Destination
   - Date (today or future)
   - Time
   - Driver Preference
4. Click "Search Available Rides"

The system will:
1. Send request to Node.js `/api/rides/find`
2. Node.js forwards to FastAPI `/recommend`
3. FastAPI clusters and ranks rides
4. Results display with match scores

## User Flow

### Before ML Integration
```
User → Search Form → No results
```

### After ML Integration
```
User → Search Form
    ↓
Node.js validates input
    ↓
Calls FastAPI /recommend
    ↓
KMeans clusters user request
    ↓
Logistic Regression ranks matches
    ↓
Returns top 10 rides sorted by match score
    ↓
Frontend displays results with:
  - Match percentage
  - Distance to pickup/dropoff
  - Available seats
  - Time until departure
```

## Ride Match Score Calculation

The AI model uses 5 features:

| Feature | Type | Range | Meaning |
|---------|------|-------|---------|
| `pickup_distance` | float | 0-50+ km | Distance from user location to ride pickup |
| `drop_distance` | float | 0-50+ km | Distance from ride dropoff to user destination |
| `time_difference` | float | 0-1440 min | Minutes until ride departure |
| `available_seats` | int | 1-7 | Number of available seats |
| `gender_match` | 0\|1 | 0 or 1 | Whether driver/passenger gender matches preference |

### Match Score Interpretation
- **90-100%**: Excellent match - highly recommended
- **70-90%**: Good match - likely compatible
- **50-70%**: Fair match - might work
- **Below 50%**: Poor match - consider other options

## Troubleshooting

### "Failed to find rides" Error
1. Check if Python service is running: `curl http://localhost:8000/health`
2. Verify `ML_SERVICE_URL` in `.env` file
3. Check browser console for specific error message

### "ML service not available" Error
1. ML service is not running. Start it with:
   ```bash
   cd server/ml
   python -m uvicorn app:app --port 8000
   ```
2. Wait 2-3 seconds for service to start
3. Try the search again

### Models not loading
1. Check that pickle files are in `server/ml/` directory
2. Verify file names match exactly:
   - `pickup_kmeans_model.pkl`
   - `hybrid_logistic_model.pkl`
3. Check server logs for detailed error message

### No results even with CSV files
1. Verify CSV files are in `server/ml/` directory
2. Check that column names exactly match:
   - `pickup_distance`, `drop_distance`, `time_difference`, `available_seats`, `gender_match`
3. Verify CSV data is valid (no missing values)

## Next Steps

### Optimize Distance Calculation
Currently using mock distances. For production:
1. Integrate Google Maps API to calculate real distances
2. Implement location-based search using coordinates
3. Add real-time traffic data

### Add More Features
1. User rating/reviews
2. Vehicle type preferences
3. Smoking/no-smoking
4. Music preferences
5. Luggage capacity

### Implement Booking System
1. When user clicks "Book This Ride"
2. Create booking record in MongoDB
3. Notify ride driver
4. Confirm with rider

### Add Notifications
1. When new matching rides found
2. When ride is confirmed
3. Real-time updates during ride

## File Structure

```
PoolDesk/
├── client/
│   ├── pages/
│   │   └── Dashboard.tsx          (Updated with ride search)
│   └── components/
│       └── RideResults.tsx        (New: displays matches)
├── server/
│   ├── ml/
│   │   ├── app.py               (New: FastAPI service)
│   │   ├── requirements.txt      (New: Python deps)
│   │   ├── README.md            (New: ML service docs)
│   │   ├── pickup_kmeans_model.pkl    (Add your file)
│   │   ├── hybrid_logistic_model.pkl  (Add your file)
│   │   └── final_rides.csv           (Optional)
│   ├── routes/
│   │   ├── auth.ts
│   │   └── rides.ts             (New: ride endpoints)
│   ├── services/
│   │   └── recommendationService.ts  (New: ML service client)
│   ├── db.ts
│   └── index.ts                 (Updated with rides routes)
├── .env                         (Updated with ML_SERVICE_URL)
└── .env.example                 (Updated template)
```

## Performance Notes

- ML service runs independently from Node.js
- Requests processed async - no blocking
- KMeans clustering is fast (<10ms typical)
- Logistic regression prediction is fast (<5ms typical)
- With CSV data: may take 50-100ms for first request
- Subsequent requests cached by KMeans model

## Security Considerations

1. **API Validation**: Node.js validates all user input before forwarding
2. **Error Handling**: Detailed errors logged server-side, generic messages to client
3. **CORS**: Enabled on FastAPI for local development
4. **MongoDB**: User data encrypted, passwords hashed with bcryptjs

## Questions or Issues?

Check the logs:
```bash
# Node.js server logs (Terminal 1)
# Shows request/response and validation errors

# Python service logs (Terminal 2)
# Shows model loading status and prediction details
```

Both will print detailed debugging information if something goes wrong.
