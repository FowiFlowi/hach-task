const request = require('request'),
	gd = require('node-gd'),
	fs = require('fs'),
	config = require('./config.json')
	img = gd.createSync(2048, 1024),
	login = config.login,
	pass = config.pass,
	VK = new (require('node-vkapi'))({ 
		auth: {login, pass},
		app: {
			id: config.app.id,
			secret: config.app.secret
		}
	});

img.colorAllocate(140, 30, 107); // background-color
let titleColor = img.colorAllocate(255, 255, 255),
	dateColor = img.colorAllocate(200, 200, 200),
	channel = '1plus1';

request('https://api.ovva.tv/v2/ru/tvguide/' + channel, (err, res, body) => {
	body = JSON.parse(body);
	if (err) {
		console.log(err);
		return;
	}
	if (body.error) {
		console.log(body.error);
		return;
	}

	let program = body.data,
		{date, programs} = program,
		Y = 130,
		X = 300,
		dateNow = new Date(),
		month = dateNow.getMonth(),
		day = dateNow.getDate(),
		fontPath = './font.ttf';

	// формироуем изображение
	img.stringFT(titleColor, fontPath, 35, 0, 400, 35, 'Програма телеканала ' + channel + ' на сегодня (' + (month + 1) + '.' + day + ')');

	for (let i = 0; i < programs.length; i++) {
		let obj = programs[i],
			startTime = cut(obj.realtime_begin),
			endTime = cut(obj.realtime_end);

		img.stringFT(titleColor, fontPath, 30, 0, X, Y, obj.title);
		img.stringFT(dateColor, fontPath, 20, 0, X, Y + 30, startTime + '-' + endTime);

		Y += 85;
		if (Y > 1000) {
			X = 1300;
			Y = 130;
		}
	}
	img.stringFT(img.colorAllocate(250, 0, 0), fontPath, 30, 0, 2000, 1010, '<3');

	img.savePng('image.png', 1, err => {
		if (err) {
			console.log(err);
			return;
		}
	});
	img.destroy();

	let vkdata = {};
	VK.auth.user({
		scope: ['groups', 'photos', 'wall']
	}).then(token => {
		vkdata.token = token.access_token;
		return VK.call('groups.create', {
			owner_id: token.user_id,
			title: 'Всех Не Отчислят',
			type: 'group',
			description: 'hachathon-task',
			subtype: 1
		})
	}).then(group => {
		console.log('group has created: https://vk.com/club' + group.id + ':\n');
		console.log(group);
		vkdata.group = group;
		return VK.upload('photo_wall', {
			data: fs.createReadStream('image.png')
		})
	}).then(res => VK.call('wall.post', {
			access_token: vkdata.token,
			from_group: 1,
			signed: 1,
			owner_id: 0 - vkdata.group.id,
			message: '<3',
			attachments: 'photo' + 92382956 + '_' + res[0].id
		})
	).then(res => 'https://vk.com/club' + vkdata.group.id + '?w=wall-' + vkdata.group.id + '_' + res.post_id)
	.then(link => console.log('This is our image: ' + link))
	.catch(e => console.log(e));

});

// convert unix-time
function cut(unix_timestamp) { 
	let date = new Date(unix_timestamp * 1000),
		hours = date.getHours(),
		minutes = '0' + date.getMinutes();

	return hours + ':' + minutes.substr(-2);
}