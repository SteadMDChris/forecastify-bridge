from flask import Flask, request, jsonify
import pandas as pd
import io
import os
import traceback
from app.utils import logger
from app.data_processing import zero_fill_and_aggregate
from app.forecasting import run_prophet_forecast

app = Flask(__name__)

@app.route('/health')
def health_check():
    logger.info("Health check endpoint called")
    return 'Python service is running'

@app.route("/process", methods=["POST"])
def process_file():
    logger.info("Starting file processing endpoint")
    try:
        data = request.json
        logger.info("Request received with data")
        
        file_content = data.get("fileContent")
        if not file_content:
            logger.error("No file content provided")
            return jsonify({"error": "No file content provided"}), 400

        # Read CSV content into pandas DataFrame
        logger.info("Reading CSV content")
        try:
            df = pd.read_csv(io.StringIO(file_content))
            logger.info(f"DataFrame shape: {df.shape}")
        except Exception as e:
            logger.error(f"Error reading CSV: {str(e)}\n{traceback.format_exc()}")
            return jsonify({"error": f"Error reading CSV: {str(e)}"}), 400

        # Adjust column names as per your logic
        required_columns = [
            "Fact Consult Consult Created Time",
            "Fact Partner Partner Name",
            "Fact Consult Consult State",
            "Fact Consult Consult Guid"
        ]
        
        # Check if all required columns exist
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            error_msg = f"Missing required columns: {', '.join(missing_columns)}"
            logger.error(error_msg)
            return jsonify({"error": error_msg}), 400

        datetime_col = "Fact Consult Consult Created Time"
        program_col = "Fact Partner Partner Name"
        state_col = "Fact Consult Consult State"
        unique_id_col = "Fact Consult Consult Guid"

        logger.info("Processing timestamps")
        df["timestamp"] = pd.to_datetime(df[datetime_col], errors="coerce")
        null_timestamps = df["timestamp"].isnull().sum()
        if null_timestamps > 0:
            logger.warning(f"Found {null_timestamps} rows with invalid timestamps")
        
        df = df.dropna(subset=["timestamp"])
        if len(df) == 0:
            error_msg = "No valid data rows after processing timestamps"
            logger.error(error_msg)
            return jsonify({"error": error_msg}), 400
            
        df = df.sort_values("timestamp").reset_index(drop=True)
        logger.info(f"Processed DataFrame shape: {df.shape}")

        logger.info("Aggregating data")
        try:
            df_agg, df_total = zero_fill_and_aggregate(df, program_col, state_col, unique_id_col)
            logger.info(f"Aggregated data shape: {df_total.shape}")
        except Exception as e:
            logger.error(f"Error in aggregation: {str(e)}\n{traceback.format_exc()}")
            return jsonify({"error": f"Error in data aggregation: {str(e)}"}), 500

        logger.info("Running forecast")
        try:
            model, forecast = run_prophet_forecast(df_total)
            logger.info("Forecast completed successfully")
        except Exception as e:
            logger.error(f"Error in forecasting: {str(e)}\n{traceback.format_exc()}")
            return jsonify({"error": f"Error in forecasting: {str(e)}"}), 500

        # Format the next seven days forecast
        logger.info("Formatting response")
        next_seven_days = []
        for i in range(7):
            forecast_date = forecast.iloc[-7 + i]
            next_seven_days.append({
                "date": forecast_date["ds"].strftime("%Y-%m-%d"),
                "predicted": round(float(forecast_date["yhat"]), 2)
            })

        response_data = {
            "data": {
                "overview": {
                    "minDate": df["timestamp"].min().strftime("%Y-%m-%d"),
                    "maxDate": df["timestamp"].max().strftime("%Y-%m-%d"),
                    "dataCoverageDays": (df["timestamp"].max() - df["timestamp"].min()).days,
                    "totalRows": len(df),
                    "partners": df[program_col].unique().tolist()
                },
                "forecast": {
                    "nextSevenDays": next_seven_days
                }
            }
        }
        
        logger.info("Processing completed successfully")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            "error": f"Unexpected error: {str(e)}"
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Starting Flask app on port {port}")
    app.run(host="0.0.0.0", port=port)