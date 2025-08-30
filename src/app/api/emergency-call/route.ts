import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { reason, message, timestamp } = await request.json();

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('Twilio credentials not configured');
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 503 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const toNumber = process.env.EMERGENCY_CONTACT_PHONE;

    if (!fromNumber || !toNumber) {
      console.error('Emergency contact phone numbers not configured');
      return NextResponse.json(
        { error: 'Emergency contacts not configured' },
        { status: 503 }
      );
    }

    // Create Twilio client
    const client = require('twilio')(accountSid, authToken);

    // Create TwiML for the voice message
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" rate="slow">
        This is a Failsafe emergency alert. ${message}. 
        Please check your security system immediately. 
        This message will repeat twice.
    </Say>
    <Pause length="2"/>
    <Say voice="alice" rate="slow">
        Repeating: This is a Failsafe emergency alert. ${message}. 
        Please check your security system immediately.
    </Say>
</Response>`;

    const call = await client.calls.create({
      twiml,
      to: toNumber,
      from: fromNumber,
      timeout: 30,
      record: false
    });

    console.log(`Emergency call initiated: ${call.sid}`);

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Emergency call failed:', error);
    return NextResponse.json(
      { error: 'Failed to initiate emergency call' },
      { status: 500 }
    );
  }
}