import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const alertPhoneNumber = process.env.ALERT_PHONE_NUMBER;

export async function POST(request: Request) {
  try {
    if (!accountSid || !authToken || !fromNumber || !alertPhoneNumber) {
      console.error('Twilio configuration missing');
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    const { location, reason } = await request.json();
    
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return NextResponse.json({ error: 'Invalid location data' }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);

    const baseMessage = reason === 'deadline' 
      ? 'Emergency alert: Failsafe deadline missed. User may be in distress.' 
      : 'Emergency alert: Incorrect password entered. Potential security breach detected.';

    const locationMessage = `Location coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}. Accuracy: approximately ${location.accuracy} meters.`;
    
    const fullMessage = `${baseMessage} ${locationMessage} This is an automated security alert from the failsafe system.`;

    const call = await client.calls.create({
      twiml: `
        <Response>
          <Say voice="alice" rate="0.9">
            ${fullMessage}
          </Say>
          <Pause length="2"/>
          <Say voice="alice" rate="0.7">
            Repeating coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
          </Say>
        </Response>
      `,
      to: alertPhoneNumber,
      from: fromNumber,
    });

    console.log(`Location alert call initiated: ${call.sid}`);
    console.log(`Location: ${location.latitude}, ${location.longitude} (accuracy: ${location.accuracy}m)`);

    return NextResponse.json({ 
      success: true, 
      callSid: call.sid,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      }
    });

  } catch (error) {
    console.error('Failed to send location alert:', error);
    return NextResponse.json({ 
      error: 'Failed to send location alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}