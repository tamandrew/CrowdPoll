import "./index.css"
import { useState, useEffect, useRef } from "react";
import Poll from "./Poll"
import Welcome from "./Welcome";
import Alert from "./misc/Alert";
import { w3cwebsocket as W3CWebSocket } from "websocket";

function App(props) {
	const [poll, setPoll] = useState(null);
	const [alert, setAlert] = useState(null);

	const [pollId, setPollId] = useState("")
	const [userId, setUserId] = useState("")

	const pingRef = useRef(null);

	const verifyId = async () => {
		if (userId !== "") {
			var storedUserId = userId
		} else {
			storedUserId = localStorage.getItem("userId")
			if (!storedUserId) {
				storedUserId = "null";
			}
		}

		//verify that the user id is in the database
		const url = `${process.env.NODE_ENV !== "production" ? process.env.REACT_APP_DEV_HTTP_URL : process.env.REACT_APP_PROD_HTTP_URL}/api/users/${storedUserId}`
		const message = await fetch(url)
			.then(response => response.json())	
			.catch((error) => {
				console.log(error);
				return null;
			});

		if (!message) { //error
			setAlert(<Alert timeout={10000} title={"Connection Error"} message={"Failed to connect to server. Please try again in a moment"} setAlert={setAlert} />)
			return;
		}

		localStorage.setItem("userId", message)
		setUserId(message);
	
		if (storedUserId === message) //user id found in db, no change
			console.log("R " + storedUserId)
		else { //new user id created, either none provided or invalid one provided
			console.log("N " + message)
			localStorage.removeItem("created") //remove created matrices since userId changed
		}
		


	}

	useEffect(() => {
		verifyId();

		const idParam = new URLSearchParams(window.location.search).get("poll")
		if (idParam)
			setPollId(idParam);
			
		// eslint-disable-next-line
	}, [])

	useEffect(() => {
		clearInterval(pingRef.current)

		if (pollId && userId)
			getPoll()
		else
			setPoll(null)

		// eslint-disable-next-line
	}, [pollId, userId])

	const getPoll = async () => {
		if (!pollId) {
			return false;
		}  
		
		//open a websocket connection to communicate with the server
		const url = `${process.env.NODE_ENV !== "production" ? process.env.REACT_APP_DEV_WS_URL : process.env.REACT_APP_PROD_WS_URL}?poll=${pollId}&user=${userId}`
		const ws = new W3CWebSocket(url);

		ws.onopen = () => {
			console.log("Successfully Connected to Server")
			console.log(ws)
		}

		ws.onerror = (error) => {
			setAlert(<Alert timeout={5000} title={"Error connecting to server"} message={"Please refresh and try again in a moment"} setAlert={setAlert} />)
			console.log(error)
			ws.close();
		}

		ws.onmessage = (message) => {
			const data = JSON.parse(message.data)
			console.log(data)
			
			//catch any errors. server will only send an "error" in data if there is an error
			if (data["error"]) {
				switch (data["error"]) {
					case "Invalid Poll ID":
						setAlert(<Alert timeout={10000} title={"Error"} message={"Poll Deleted or Does Not Exist"} setAlert={setAlert} />)
						setPollId(null)
						break;

					case "Invalid User ID":
						setAlert(<Alert timeout={10000} title={"Error"} message={"User ID Invalid"} setAlert={setAlert} />)
						verifyId();
						break;
					case "Permission Denied":
						setAlert(<Alert timeout={10000} title={"Not Owner"} message={"Permission Denied"} setAlert={setAlert} />)
						break;
					case "Poll Deleted":
						setAlert(<Alert timeout={10000} title={"Poll Deleted"} message={"Poll Deleted"} setAlert={setAlert} />)
						setPollId(null)
						break;
					default: //other kind of error, no need to handle
						console.log(data["error"])
						break;
				}
				return;
			}

			
			//server will only send update if there is an "update" in data
			if (data["update"]) {
				//update poll with data from server
				setPoll( 
					<Poll pollId={data["pollId"]}
						title={data["title"]}
						options={data["options"]}
						settings={data["settings"]}
						isOwner={data["owner"]}
						votedFor={data["votedFor"]}
						userId={userId}
						ws={ws}
					/>)
			}

		}

		//ping server every 5 seconds to avoid being removed from ws connections
		const ping = setInterval(() => {
			if (ws.readyState === ws.CLOSED) {
				clearInterval(ping)
				setAlert(<Alert timeout={5000} title={"Error"} message={"Connection to server lost. Trying to reconnect..."} setAlert={setAlert} />)
				getPoll(); //retry to connect
			} else {
				ws.send(JSON.stringify({"type": "ping"}))
			}
		}, 5000)
		pingRef.current = ping;
	}


	if (pollId) {
		if (poll) 
			var display = poll
		else
			display = (<div className = "m-4 text-gray-100 animate-fade">
							{"If the poll does not load, click "}
							<button className="animate-fade underline" onClick={() => getPoll()}>here</button>
							{" to retry the connection. Otherwise, there may be a problem with the server. Click "}
							<a className="animate-fade underline" href = "./">here</a>
							{" to go back to the home page."}
						</div>)
	} else {
		display = <Welcome setPollId={setPollId} userId={userId} verifyId = {verifyId} />
	}


	return (<div>
		{alert}
		{display}
	</div>)

}

export default App;
