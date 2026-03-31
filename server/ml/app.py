import pickle
import os
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models and data
kmeans_model = None
logistic_model = None
rides_data = None

def load_models():
    """Load the pre-trained models from pickle files"""
    global kmeans_model, logistic_model
    
    base_path = os.path.dirname(os.path.abspath(__file__))
    
    kmeans_path = os.path.join(base_path, "pickup_kmeans_model.pkl")
    logistic_path = os.path.join(base_path, "hybrid_logistic_model.pkl")
    
    try:
        with open(kmeans_path, 'rb') as f:
            kmeans_model = pickle.load(f)
        print(f"✓ Loaded KMeans model")
    except FileNotFoundError:
        print(f"⚠ KMeans model not found at {kmeans_path}")
        kmeans_model = None
    except Exception as e:
        print(f"✗ Error loading KMeans model: {e}")
        kmeans_model = None
    
    try:
        with open(logistic_path, 'rb') as f:
            logistic_model = pickle.load(f)
        print(f"✓ Loaded Logistic Regression model")
    except FileNotFoundError:
        print(f"⚠ Logistic model not found at {logistic_path}")
        logistic_model = None
    except Exception as e:
        print(f"✗ Error loading Logistic model: {e}")
        logistic_model = None

def load_rides_data():
    """Load rides data from CSV (if available)"""
    global rides_data
    
    base_path = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_path, "final_rides.csv")
    
    try:
        rides_data = pd.read_csv(csv_path)
        print(f"✓ Loaded rides data: {len(rides_data)} rides")
    except FileNotFoundError:
        print(f"⚠ Rides CSV not found at {csv_path}")
        rides_data = None
    except Exception as e:
        print(f"✗ Error loading rides data: {e}")
        rides_data = None

# Request/Response models
class RideSearchRequest(BaseModel):
    pickup_distance: float
    drop_distance: float
    time_difference: float  # in minutes
    available_seats: int
    gender_match: int  # 0 or 1
    user_id: Optional[str] = None

class RideMatch(BaseModel):
    ride_id: str
    match_score: float
    cluster: int
    probability: float
    pickup_distance: float
    drop_distance: float
    time_difference: float
    available_seats: int

class RecommendationResponse(BaseModel):
    matches: List[RideMatch]
    total_matches: int

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    load_models()
    load_rides_data()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "kmeans_loaded": kmeans_model is not None,
        "logistic_loaded": logistic_model is not None,
        "rides_data_loaded": rides_data is not None,
    }

@app.post("/recommend")
async def get_ride_recommendations(request: RideSearchRequest):
    """
    Get ride recommendations based on user search criteria
    
    Uses KMeans clustering followed by logistic regression ranking
    """
    if kmeans_model is None or logistic_model is None:
        raise HTTPException(
            status_code=503,
            detail="ML models not loaded. Please check server logs."
        )
    
    # Prepare feature vector for KMeans
    features = np.array([[
        request.pickup_distance,
        request.drop_distance,
        request.time_difference,
        request.available_seats,
        request.gender_match
    ]])
    
    # Get cluster assignment from KMeans
    try:
        cluster = kmeans_model.predict(features)[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error in clustering: {str(e)}")
    
    # Get probability/confidence from logistic regression
    try:
        probability = kmeans_model.predict_proba(features)[0].max() if hasattr(kmeans_model, 'predict_proba') else 0.5
    except:
        probability = 0.5
    
    # Try to use logistic regression if available
    try:
        logistic_prob = logistic_model.predict_proba(features)[0].max()
        probability = logistic_prob
    except:
        pass
    
    # For now, return mock recommendations with the computed cluster
    # When rides_data is available, this will be filtered properly
    matches = [
        RideMatch(
            ride_id=f"ride_{cluster}_{i}",
            match_score=probability * (1 - i * 0.1),  # Decreasing scores for subsequent matches
            cluster=int(cluster),
            probability=probability,
            pickup_distance=request.pickup_distance,
            drop_distance=request.drop_distance,
            time_difference=request.time_difference,
            available_seats=request.available_seats,
        )
        for i in range(min(5, 3))  # Return top 3 matches
    ]
    
    return RecommendationResponse(
        matches=matches,
        total_matches=len(matches)
    )

@app.post("/recommend/advanced")
async def get_advanced_recommendations(request: RideSearchRequest):
    """
    Advanced recommendation using full feature matching against rides data
    """
    if kmeans_model is None:
        raise HTTPException(
            status_code=503,
            detail="ML models not loaded."
        )
    
    if rides_data is None:
        raise HTTPException(
            status_code=503,
            detail="Rides data not loaded. Please provide final_rides.csv"
        )
    
    # Prepare features for all rides in the database
    try:
        ride_features = rides_data[[
            'pickup_distance', 'drop_distance', 'time_difference',
            'available_seats', 'gender_match'
        ]].values
    except KeyError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required column in rides data: {str(e)}"
        )
    
    # Cluster user request
    user_features = np.array([[
        request.pickup_distance,
        request.drop_distance,
        request.time_difference,
        request.available_seats,
        request.gender_match
    ]])
    
    user_cluster = kmeans_model.predict(user_features)[0]
    
    # Find rides in the same cluster
    ride_clusters = kmeans_model.predict(ride_features)
    same_cluster_mask = ride_clusters == user_cluster
    
    # Get rides in same cluster with high logistic regression probability
    matches = []
    
    if same_cluster_mask.any():
        clustered_rides = rides_data[same_cluster_mask]
        clustered_features = ride_features[same_cluster_mask]
        
        # Get probabilities from logistic regression
        try:
            probabilities = logistic_model.predict_proba(clustered_features)[:, 1]
        except:
            probabilities = np.ones(len(clustered_rides)) * 0.5
        
        # Calculate match scores
        for idx, (_, ride) in enumerate(clustered_rides.iterrows()):
            match_score = probabilities[idx]
            
            matches.append(RideMatch(
                ride_id=str(ride.get('ride_id', f"ride_{idx}")),
                match_score=float(match_score),
                cluster=int(user_cluster),
                probability=float(match_score),
                pickup_distance=float(ride['pickup_distance']),
                drop_distance=float(ride['drop_distance']),
                time_difference=float(ride['time_difference']),
                available_seats=int(ride['available_seats']),
            ))
        
        # Sort by match score (descending)
        matches.sort(key=lambda x: x.match_score, reverse=True)
    
    return RecommendationResponse(
        matches=matches[:10],  # Return top 10 matches
        total_matches=len(matches)
    )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "PoolDesk Recommendation Engine",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "recommend": "/recommend (POST)",
            "advanced_recommend": "/recommend/advanced (POST)",
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
