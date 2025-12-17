import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "../../../passwordHashing";
import { LineageConnectionFactory } from "@/app/utils";
import { env } from "@/env.mjs";
import jwt from "jsonwebtoken";
import { LibsqlError } from "@libsql/client/web";

interface InputData {
  email: string;
  password: string;
  password_conf: string;
}

export async function POST(input: NextRequest) {
  const inputData = (await input.json()) as InputData;
  const { email, password, password_conf } = inputData;

  if (email && password && password_conf) {
    if (password == password_conf) {
      const passwordHash = await hashPassword(password);
      const conn = LineageConnectionFactory();
      const userCreationQuery = `
    INSERT INTO User (email, provider, password_hash)
    VALUES (?, ?, ?)
  `;
      const params = [email, "email", passwordHash];
      try {
        await conn.execute({ sql: userCreationQuery, args: params });

        const res = await sendEmailVerification(email);
        const json = await res.json();
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
      } catch (e) {
        console.error(e);
        if (e instanceof LibsqlError && e.code === "SQLITE_CONSTRAINT") {
          return new NextResponse(
            JSON.stringify({
              success: false,
              message: "User already exists",
            }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: "An error occurred while creating the user",
          }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
    }
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Password mismatch",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  return new NextResponse(
    JSON.stringify({
      success: false,
      message: "Missing required fields",
    }),
    { status: 400, headers: { "content-type": "application/json" } },
  );
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
