import json
import os
import boto3
from datetime import datetime

s3_client = boto3.client('s3')

# Get bucket name from environment variable or fallback
RESUME_STORAGE_BUCKET = os.environ.get('RESUME_STORAGE_BUCKET', 'my-generated-resumes-exports')

def lambda_handler(event, context):
    print("Received event:", json.dumps(event))

    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }

    try:
        body = json.loads(event['body'])
        print("Incoming body keys:", list(body.keys()))

        # Fix for name issue: check both 'fullName' and 'name'
        name = str(body.get('fullName') or body.get('name') or 'N/A').strip()
        email = str(body.get('email', 'N/A')).strip()
        phone = str(body.get('phone', 'N/A')).strip()
        summary = str(body.get('summary', 'N/A')).strip()

        skills_raw = str(body.get('skills', '')).strip()
        skills = [s.strip() for s in skills_raw.split(',') if s.strip()]

        education = body.get('education', [])
        experience = body.get('experience', [])
        projects = body.get('projects', [])

        resume_html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{name}'s Professional Resume</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 30px auto; padding: 25px; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background-color: #fff; }}
                h1 {{ color: #2c3e50; text-align: center; margin-bottom: 10px; }}
                .contact-info {{ text-align: center; font-size: 0.9em; color: #555; margin-bottom: 20px; }}
                h2 {{ color: #34495e; border-bottom: 2px solid #34495e; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px; }}
                h3 {{ color: #2980b9; margin-bottom: 5px; }}
                ul {{ list-style-type: disc; padding-left: 20px; margin-top: 5px; }}
                li {{ margin-bottom: 8px; }}
                .section {{ margin-bottom: 25px; }}
                .sub-heading {{ font-weight: bold; margin-bottom: 5px; display: block; }}
                .details {{ font-size: 0.9em; color: #666; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{name}</h1>
                <p class="contact-info">Email: {email} | Phone: {phone}</p>
            </div>

            <div class="section">
                <h2>Summary</h2>
                <p>{summary}</p>
            </div>
        """

        if skills:
            resume_html_content += "<div class='section'><h2>Skills</h2><ul>"
            for skill in skills:
                resume_html_content += f"<li>{skill}</li>"
            resume_html_content += "</ul></div>"

        if education:
            resume_html_content += "<div class='section'><h2>Education</h2>"
            for entry in education:
                school = str(entry.get('school', 'N/A')).strip()
                degree = str(entry.get('degree', 'N/A')).strip()
                year = str(entry.get('year', 'N/A')).strip()
                resume_html_content += f"""
                <p>
                    <span class="sub-heading">{degree} from {school}</span><br>
                    <span class="details">Graduation Year: {year}</span>
                </p>
                """
            resume_html_content += "</div>"

        if experience:
            resume_html_content += "<div class='section'><h2>Experience</h2>"
            for entry in experience:
                company = str(entry.get('company', 'N/A')).strip()
                role = str(entry.get('role', 'N/A')).strip()
                duration = str(entry.get('duration', 'N/A')).strip()
                resume_html_content += f"""
                <p>
                    <span class="sub-heading">{role} at {company}</span><br>
                    <span class="details">Duration: {duration}</span>
                </p>
                """
            resume_html_content += "</div>"

        if projects:
            resume_html_content += "<div class='section'><h2>Projects</h2><ul>"
            for entry in projects:
                title = str(entry.get('title', 'N/A')).strip()
                description = str(entry.get('description', '')).strip()
                if title:
                    resume_html_content += f"""
                    <li>
                        <h3>{title}</h3>
                        <p>{description}</p>
                    </li>
                    """
            resume_html_content += "</ul></div>"

        resume_html_content += "</body></html>"

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        safe_name = "".join(filter(str.isalnum, name)).lower() or "resume"
        s3_key = f"generated_resumes/{safe_name}_{timestamp}.html"

        print(f"Uploading to s3://{RESUME_STORAGE_BUCKET}/{s3_key}")

        s3_client.put_object(
            Bucket=RESUME_STORAGE_BUCKET,
            Key=s3_key,
            Body=resume_html_content.encode('utf-8'),
            ContentType='text/html'
        )

        download_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': RESUME_STORAGE_BUCKET, 'Key': s3_key},
            ExpiresIn=3600
        )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'Resume generated successfully!',
                'downloadUrl': download_url
            })
        }

    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid JSON in request body.'})
        }

    except s3_client.exceptions.NoSuchBucket:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'S3 bucket "{RESUME_STORAGE_BUCKET}" not found.'})
        }

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Unexpected error: {str(e)}'})
        }
