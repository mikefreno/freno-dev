import { LineageConnectionFactory } from "@/app/utils";
import { env } from "@/env.mjs";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

interface InputData {
  email: string;
}
export async function POST(input: NextRequest) {
  const inputData = (await input.json()) as InputData;
  const { email } = inputData;
  const conn = LineageConnectionFactory();
  const query = "SELECT * FROM User WHERE email = ?";
  const params = [email];

  const res = await conn.execute({ sql: query, args: params });

  if (res.rows.length == 0 || res.rows[0].email_verified) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Invalid Request",
      }),
      { status: 409, headers: { "content-type": "application/json" } },
    );
  }

  const email_res = await sendEmailVerification(email);
  const json = await email_res.json();
  if (json.messageId) {
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Email verification sent!",
      }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  } else {
    return NextResponse.json(json);
  }
}

async function sendEmailVerification(userEmail: string) {
  const apiKey = env.SENDINBLUE_KEY as string;
  const apiUrl = "https://api.sendinblue.com/v3/smtp/email";

  const secretKey = env.JWT_SECRET_KEY;
  const payload = { email: userEmail };
  const token = jwt.sign(payload, secretKey, { expiresIn: "15m" });

  const sendinblueData = {
    sender: {
      name: "MikeFreno",
      email: "lifeandlineage_no_reply@freno.me",
    },
    to: [
      {
        email: userEmail,
      },
    ],
    htmlContent: `<html>
<head>
    <style>
        .center {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            color: #ffffff;
            background-color: #007BFF;
            border-radius: 6px;
            transition: background-color 0.3s;
        }
        .button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="center">
        <p>Click the button below to verify email</p>
    </div>
    <br/>
    <div class="center">
        <a href=${env.NEXT_PUBLIC_DOMAIN}/api/lineage/email/verification/${userEmail}/?token=${token} class="button">Verify Email</a>
    </div>
</body>
</html>
`,
    subject: `Life and Lineage email verification`,
  };
  return await fetch(apiUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(sendinblueData),
  });
}
