# PoolDesk AI Recommendation Service

This folder contains the FastAPI microservice that handles ride matching using hybrid ML models (KMeans + Logistic Regression).

## Setup

### 1. Install Python Dependencies

```bash
cd server/ml
pip install -r requirements.txt
```

### 2. Add Model Files

Place the following files in this directory:
- `pickup_kmeans_model.pkl` - KMeans clustering model
- `hybrid_logistic_model.pkl` - Logistic regression ranking model

### 3. (Optional) Add Dataset Files

For advanced matching, place the following CSV files in this directory:
- `final_rides.csv` - Available rides dataset
- `final_users.csv` - User profiles dataset
- `final_ride_requests.csv` - Ride requests dataset

## Running the Service

### Development

```bash
# Run with hot reload
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
# Run with Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app
```

## API Endpoints

### Health Check
```
GET /health
```
Returns the status of loaded models and data.

### Get Recommendations
```
POST /recommend
```
Simple recommendation using KMeans clustering and logistic regression.

**Request Body:**
```json
{
  "pickup_distance": 25.5,
  "drop_distance": 15.3,
  "time_difference": 120,
  "available_seats": 2,
  "gender_match": 1,
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "matches": [
    {
      "ride_id": "ride_0_0",
      "match_score": 0.95,
      "cluster": 2,
      "probability": 0.95,
      "pickup_distance": 25.5,
      "drop_distance": 15.3,
      "time_difference": 120,
      "available_seats": 2
    }
  ],
  "total_matches": 1
}
```

### Advanced Recommendations
```
POST /recommend/advanced
```
Advanced recommendation that matches against the rides database (requires CSV files).

Same request and response format as `/recommend`, but filters against actual rides data.

## Integration with Node.js Backend

The Node.js Express server at `/api/rides/find` acts as a proxy to this ML service:

1. User submits search form on Dashboard
2. Frontend calls `/api/rides/find` (Node.js endpoint)
3. Node.js server calls FastAPI `/recommend` endpoint
4. Results are returned to the frontend
5. RideResults component displays the matches

## Environment Variables

Set in the Node.js `.env` file:

```
ML_SERVICE_URL=http://localhost:8000
```

If running the ML service on a different host, update this URL accordingly.

## Feature Explanation

### Input Features
- **pickup_distance**: Distance from user's current location to ride's pickup point (km)
- **drop_distance**: Distance from ride's destination to user's destination (km)
- **time_difference**: Time until ride departure (minutes)
- **available_seats**: Number of available seats in the ride
- **gender_match**: 1 if driver's gender matches user preference, 0 otherwise

### Matching Process
1. **KMeans Clustering**: Groups rides by similar characteristics
2. **Logistic Regression**: Ranks rides within clusters by match probability
3. **Results**: Top 10 matches returned, sorted by match score

## Troubleshooting

### Models not loading
- Ensure pickle files are in the `server/ml/` directory
- Check file permissions
- Verify pickle files are compatible with your Python/scikit-learn version

### Connection refused
- Ensure ML service is running on the configured port
- Check firewall settings
- Verify `ML_SERVICE_URL` in .env file

### Missing CSV data
- Service works without CSVs (returns mock results)
- Add CSV files to enable advanced matching
- Ensure column names match: `pickup_distance`, `drop_distance`, `time_difference`, `available_seats`, `gender_match`
